let currentUser = null;
let groups = [];
let currentGroup = null;
let hasEnteredGroup = false;
let events = [];
let currentEventId = null;
let billDraft = [];
let places = [];

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}

function toast(msg) {
  const h = document.getElementById('hint');
  h.textContent = msg;
  h.classList.add('show');
  clearTimeout(window._t);
  window._t = setTimeout(() => h.classList.remove('show'), 1800);
}

function fmtVnd(n) {
  return Number(n || 0).toLocaleString('vi-VN') + 'đ';
}

function refreshIcons() {
  if (window.lucide) lucide.createIcons();
}

function nav(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  const target = document.querySelector('.screen[data-id="' + id + '"]');
  if (target) {
    target.classList.add('active');
    target.parentElement.scrollTop = 0;
  }
  if (id === 'GROUP_PICKER') {
    document.getElementById('group-picker-back').style.visibility = hasEnteredGroup ? 'visible' : 'hidden';
    document.getElementById('group-picker-hint').textContent =
      groups.length > 0
        ? 'Bạn đang tham gia nhiều nhóm, chọn 1 nhóm để tiếp tục nhé.'
        : 'Bạn chưa thuộc nhóm nào. Tạo nhóm mới hoặc nhập mã mời để tham gia nhé.';
  }
  refreshIcons();
}

/* ---------- Auth ---------- */

async function doLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  if (!username || !password) return toast('Nhập đủ tên đăng nhập và mật khẩu nhé');
  try {
    await api.login(username, password);
    await afterAuth();
  } catch (e) {
    toast(e.message);
  }
}

async function doRegister() {
  const username = document.getElementById('reg-username').value.trim();
  const display_name = document.getElementById('reg-display').value.trim();
  const password = document.getElementById('reg-password').value;
  if (!username || !password || !display_name) return toast('Điền đủ thông tin nhé');
  try {
    await api.register(username, password, display_name);
    await afterAuth();
  } catch (e) {
    toast(e.message);
  }
}

async function doLogout() {
  await api.logout();
  currentUser = null;
  groups = [];
  currentGroup = null;
  hasEnteredGroup = false;
  nav('LOGIN');
}

async function afterAuth() {
  const me = await api.me();
  currentUser = me;
  groups = me.groups;
  document.getElementById('profile-name').textContent = me.display_name;
  document.getElementById('profile-username').textContent = '@' + me.username;
  document.getElementById('greeting-name').textContent = 'Chào ' + me.display_name;
  renderGroupPicker();
  if (groups.length === 1) {
    await enterGroup(groups[0]);
  } else {
    nav('GROUP_PICKER');
  }
}

/* ---------- Groups ---------- */

function renderGroupPicker() {
  const wrap = document.getElementById('group-list');
  if (groups.length === 0) {
    wrap.innerHTML = '';
    return;
  }
  wrap.innerHTML = groups
    .map(
      (g, i) => `
    <div class="card">
      <div class="row" style="gap:12px;">
        <div class="icon-chip ${i % 2 === 0 ? 'coral' : 'teal'}" style="cursor:pointer;" onclick="enterGroupById(${g.id})"><i data-lucide="users" style="width:22px;height:22px;color:${i % 2 === 0 ? 'var(--coral-dark)' : 'var(--teal-dark)'};"></i></div>
        <div style="flex:1;cursor:pointer;" onclick="enterGroupById(${g.id})"><h3>${esc(g.name)}</h3><p class="meta">${esc(g.description || '')}</p></div>
        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();openGroupMembers(${g.id}, '${esc(g.name)}')">Mời</button>
      </div>
    </div>`
    )
    .join('');
  refreshIcons();
}

function enterGroupById(id) {
  const g = groups.find((x) => x.id === id);
  if (g) enterGroup(g);
}

async function enterGroup(g) {
  currentGroup = g;
  hasEnteredGroup = true;
  document.getElementById('current-group-label').innerHTML =
    esc(g.name) + ' <i data-lucide="chevron-down" style="width:12px;height:12px;"></i>';
  await loadEvents();
  nav('EVENT_LIST');
}

async function doJoinByCode() {
  const code = document.getElementById('join-code-input').value.trim();
  if (!code) return toast('Nhập mã mời trước đã nhé');
  try {
    const g = await api.joinGroup(code);
    const me = await api.me();
    groups = me.groups;
    renderGroupPicker();
    toast('Đã tham gia nhóm ' + g.name);
    await enterGroup(g);
  } catch (e) {
    toast(e.message);
  }
}

async function createGroup() {
  const name = document.getElementById('new-group-name').value.trim();
  const description = document.getElementById('new-group-desc').value.trim();
  if (!name) return toast('Nhập tên nhóm trước đã nhé');
  try {
    const g = await api.createGroup(name, description);
    const me = await api.me();
    groups = me.groups;
    renderGroupPicker();
    toast('Đã tạo nhóm ' + name);
    openGroupMembers(g.id, name);
  } catch (e) {
    toast(e.message);
  }
}

async function openGroupMembers(groupId, name) {
  document.getElementById('members-group-title').textContent = 'Thành viên · ' + name;
  try {
    const invite = await api.groupInvite(groupId);
    document.getElementById('group-invite-code').value = invite.invite_code;
    const members = await api.groupMembers(groupId);
    document.getElementById('members-list').innerHTML = members
      .map(
        (m) => `
      <div class="card"><div class="row between">
        <div class="row" style="gap:8px;"><div class="avatar-stack"><div class="dot" style="background:var(--coral);">${esc(m.display_name[0] || '?')}</div></div><h3 style="font-size:14px;margin:0;">${esc(m.display_name)}</h3></div>
        ${m.role === 'admin' ? '<span class="tag amber">Quản trị</span>' : ''}
      </div></div>`
      )
      .join('');
    window._currentInviteGroupId = groupId;
    nav('GROUP_MEMBERS');
  } catch (e) {
    toast(e.message);
  }
}

function copyInviteCode() {
  const el = document.getElementById('group-invite-code');
  el.select();
  try {
    document.execCommand('copy');
  } catch (e) {}
  toast('Đã sao chép mã mời!');
}

/* ---------- Events ---------- */

async function loadEvents() {
  events = await api.listEvents(currentGroup.id);
  renderEventList();
}

function renderEventList() {
  const wrap = document.getElementById('event-list-items');
  const open = events.filter((e) => e.status === 'open');
  wrap.innerHTML = open
    .map((e) => {
      const tagClass = e.type === 'order' ? 'tag teal' : 'tag';
      const typeLabel = e.type === 'order' ? 'Order' : 'Ăn ngoài';
      const iAmIn = e.participants.some((p) => p.id === currentUser.id);
      const dots = e.participants
        .slice(0, 3)
        .map((p) => `<div class="dot" style="background:var(--coral);">${esc(p.display_name[0] || '?')}</div>`)
        .join('');
      return `
      <div class="card card-tap" style="cursor:pointer;" onclick="openEventDetail(${e.id})">
        <div class="row between" style="margin-bottom:8px;"><span class="${tagClass}">${typeLabel}</span><span class="meta">${e.event_time ? new Date(e.event_time).toLocaleString('vi-VN') : ''}</span></div>
        <h3>${esc(e.title)}</h3>
        <p class="meta">${e.participant_count} người tham gia · ${esc(e.creator_name)} rủ${e.type === 'order' ? ' · có link order' : ''}</p>
        <div class="row between" style="margin-top:10px;">
          <div class="avatar-stack">${dots}</div>
          <button class="btn ${e.type === 'order' ? 'btn-teal' : 'btn-primary'} btn-sm" ${iAmIn ? 'disabled' : ''} onclick="event.stopPropagation();quickJoin(${e.id})">${iAmIn ? 'Đã tham gia ✓' : 'Tham gia'}</button>
        </div>
      </div>`;
    })
    .join('');
  refreshIcons();
}

function selectEventType(el, type) {
  Array.from(el.parentElement.children).forEach((c) => c.classList.remove('active'));
  el.classList.add('active');
  el.dataset.selectedType = type;
  document.getElementById('type-pills').dataset.value = type;
  document.getElementById('field-time').style.display = type === 'out' ? 'block' : 'none';
  document.getElementById('field-location').style.display = type === 'out' ? 'block' : 'none';
  document.getElementById('field-orderlink').style.display = type === 'order' ? 'block' : 'none';
}

function setDefaultEventTime() {
  const el = document.getElementById('event-time');
  const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  el.value = now.toISOString().slice(0, 16);
}

async function submitCreateEvent() {
  const type = document.getElementById('type-pills').dataset.value || 'out';
  const title = document.getElementById('event-title').value.trim();
  if (!title) return toast('Nhập tên quán / hoạt động trước đã nhé');
  const payload = {
    type,
    title,
    note: document.getElementById('event-note').value.trim(),
  };
  if (type === 'out') {
    payload.event_time = document.getElementById('event-time').value || null;
    payload.address = document.getElementById('event-address').value.trim();
    payload.map_link = document.getElementById('event-maplink').value.trim();
  } else {
    payload.order_link = document.getElementById('event-orderlink').value.trim();
  }
  try {
    await api.createEvent(currentGroup.id, payload);
    toast('Đã đăng lời rủ!');
    await loadEvents();
    nav('EVENT_LIST');
  } catch (e) {
    toast(e.message);
  }
}

async function openEventDetail(eventId) {
  currentEventId = eventId;
  try {
    const e = await api.getEvent(eventId);
    document.getElementById('detail-title').textContent = e.title;
    document.getElementById('detail-order-card').style.display = e.type === 'order' ? 'block' : 'none';
    document.getElementById('detail-location-card').style.display = e.type === 'out' ? 'block' : 'none';
    if (e.type === 'order') {
      const link = document.getElementById('detail-order-link');
      link.href = e.order_link || '#';
    } else {
      document.getElementById('detail-place-name').textContent = e.title;
      document.getElementById('detail-place-address').textContent = e.address || 'Địa chỉ chưa chốt';
      document.getElementById('detail-map-link').href = e.map_link || '#';
    }
    document.getElementById('detail-participants-title').textContent = `Ai tham gia (${e.participant_count})`;
    document.getElementById('detail-participants-list').innerHTML = e.participants
      .map((p, i) => `<span class="tag ${i % 3 === 1 ? 'teal' : i % 3 === 2 ? 'amber' : ''}">${esc(p.display_name)}</span>`)
      .join('');
    const iAmIn = e.participants.some((p) => p.id === currentUser.id);
    const joinBtn = document.getElementById('detail-join-btn');
    joinBtn.textContent = iAmIn ? 'Đã tham gia ✓' : 'Tham gia';
    joinBtn.disabled = iAmIn;

    renderBillView(e.bill || []);
    document.getElementById('detail-done-btn').style.display = e.status === 'done' ? 'none' : 'block';
    nav('EVENT_DETAIL');
  } catch (err) {
    toast(err.message);
  }
}

function renderBillView(bill) {
  const list = document.getElementById('bill-list');
  list.innerHTML = bill
    .map((b) => `<div class="bill-row"><span>${esc(b.person_name)}${b.item_name ? ' — ' + esc(b.item_name) : ''}</span><span>${fmtVnd(b.price)}</span></div>`)
    .join('');
  const total = bill.reduce((s, b) => s + b.price, 0);
  document.getElementById('bill-total').textContent = fmtVnd(total);
  billDraft = bill.map((b) => ({ person_name: b.person_name, item_name: b.item_name, price: b.price }));
}

function backToEventList() {
  loadEvents();
  nav('EVENT_LIST');
}

async function quickJoin(eventId) {
  try {
    await api.joinEvent(eventId);
    toast('Bạn đã tham gia lời rủ!');
    await loadEvents();
  } catch (e) {
    toast(e.message);
  }
}

async function joinCurrentEvent() {
  await quickJoin(currentEventId);
  await openEventDetail(currentEventId);
}

/* ---------- Bill edit ---------- */

function renderBillEdit() {
  const wrap = document.getElementById('bill-edit-rows');
  wrap.innerHTML = '';
  if (billDraft.length === 0) billDraft.push({ person_name: '', item_name: '', price: 0 });
  billDraft.forEach((row, i) => {
    const div = document.createElement('div');
    div.className = 'card';
    div.style.padding = '12px';
    div.innerHTML =
      `<input class="field" style="margin-bottom:8px;" value="${esc(row.person_name)}" placeholder="Tên người ăn" onchange="billDraft[${i}].person_name=this.value" />` +
      `<input class="field" style="margin-bottom:8px;" value="${esc(row.item_name)}" placeholder="Món đã order" onchange="billDraft[${i}].item_name=this.value" />` +
      `<div class="row" style="gap:8px;">` +
      `<input class="field" style="margin-bottom:0;" type="number" value="${row.price}" placeholder="Giá tiền" onchange="billDraft[${i}].price=Number(this.value)||0" />` +
      `<button class="btn btn-danger-outline" style="width:auto;margin:0;padding:12px 14px;" onclick="removeBillRow(${i})">✕</button>` +
      `</div>`;
    wrap.appendChild(div);
  });
}

function addBillRow() {
  billDraft.push({ person_name: '', item_name: '', price: 0 });
  renderBillEdit();
}

function removeBillRow(i) {
  billDraft.splice(i, 1);
  renderBillEdit();
}

async function saveBill() {
  try {
    const res = await api.saveBill(currentEventId, billDraft);
    renderBillView(res.bill);
    toast('Đã lưu chi phí');
    nav('EVENT_DETAIL');
  } catch (e) {
    toast(e.message);
  }
}

async function markEventDone() {
  try {
    await api.setEventStatus(currentEventId, 'done');
    await openVote(currentEventId);
  } catch (e) {
    toast(e.message);
  }
}

/* ---------- Vote / blacklist ---------- */

let voteEventPlaceId = null;

async function openVote(eventId) {
  const e = await api.getEvent(eventId);
  voteEventPlaceId = e.place_id;
  document.getElementById('vote-title').textContent = e.title;
  document.getElementById('vote-me-label').textContent = 'Bạn (' + currentUser.display_name + ')';
  document.querySelectorAll('#star-row .star').forEach((s) => (s.style.color = 'var(--line)'));
  document.getElementById('blacklist-btn').style.display = 'none';
  document.getElementById('blacklist-hint').style.display = 'none';
  window._voteStars = 0;
  nav('VOTE');
}

function rate(n) {
  window._voteStars = n;
  document.querySelectorAll('#star-row .star').forEach((s, i) => {
    s.style.color = i < n ? '#FFC259' : 'var(--line)';
  });
  const btn = document.getElementById('blacklist-btn');
  const hint = document.getElementById('blacklist-hint');
  if (n === 1) {
    btn.style.display = 'block';
    hint.style.display = 'block';
  } else {
    btn.style.display = 'none';
    hint.style.display = 'none';
  }
}

async function submitVote() {
  if (!window._voteStars) return toast('Chọn số sao trước đã nhé');
  try {
    const res = await api.vote(currentEventId, window._voteStars);
    document.getElementById('vote-others-list').innerHTML = res.votes
      .map((v) => `<div class="row between" style="padding:6px 0;"><span class="meta">${esc(v.display_name)}</span><span style="color:var(--amber);font-size:14px;">${'★'.repeat(v.stars)}${'☆'.repeat(5 - v.stars)}</span></div>`)
      .join('');
    toast('Đã gửi đánh giá, cảm ơn bạn!');
    await loadEvents();
    nav('EVENT_LIST');
  } catch (e) {
    toast(e.message);
  }
}

async function toggleBlacklist() {
  const btn = document.getElementById('blacklist-btn');
  const isBlacklisted = btn.textContent.indexOf('Đã thêm') !== -1;
  try {
    if (isBlacklisted) {
      await api.removeBlacklist(voteEventPlaceId);
      btn.innerHTML =
        '<span style="display:inline-flex;align-items:center;gap:6px;justify-content:center;width:100%;"><i data-lucide="ban" style="width:16px;height:16px;"></i>Thêm vào blacklist (cá nhân)</span>';
      toast('Đã gỡ khỏi blacklist');
    } else {
      await api.addBlacklist(voteEventPlaceId);
      btn.innerHTML =
        '<span style="display:inline-flex;align-items:center;gap:6px;justify-content:center;width:100%;"><i data-lucide="check" style="width:16px;height:16px;"></i>Đã thêm vào blacklist — Gỡ ra</span>';
      toast('Đã ẩn quán này khỏi gợi ý món của bạn');
    }
    refreshIcons();
  } catch (e) {
    toast(e.message);
  }
}

/* ---------- Places ---------- */

async function openPlaceList() {
  try {
    places = await api.listPlaces(currentGroup.id);
    renderPlaceList();
    nav('PLACE_LIST');
  } catch (e) {
    toast(e.message);
  }
}

function renderPlaceList() {
  const wrap = document.getElementById('place-list-items');
  const empty = document.getElementById('place-list-empty');
  if (places.length === 0) {
    wrap.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  wrap.innerHTML = places
    .map((p, i) => {
      const chipClass = i % 2 === 0 ? 'coral' : 'teal';
      const icon = i % 2 === 0 ? 'utensils' : 'cup-soda';
      const ratingText = p.avg_rating ? `★ ${p.avg_rating}` : 'Chưa có đánh giá';
      return `
      <div class="card card-tap"><div class="row" style="gap:12px;">
        <div class="icon-chip ${chipClass}"><i data-lucide="${icon}" style="width:22px;height:22px;color:var(--${chipClass}-dark);"></i></div>
        <div style="flex:1;"><div class="row between"><h3>${esc(p.name)}</h3><span style="color:var(--amber-dark);font-weight:700;font-size:13px;">${ratingText}</span></div><p class="meta">${esc(p.address || '')}</p></div>
      </div></div>`;
    })
    .join('');
  refreshIcons();
}

/* ---------- Profile / history ---------- */

async function loadProfileExtras() {
  try {
    const stats = await api.stats();
    document.getElementById('profile-eat-count').textContent = stats.eat_count;
    document.getElementById('profile-fav-count').textContent = stats.favorite_count;
    const hist = await api.history();
    const recent = hist.slice(0, 1);
    document.getElementById('history-recent').innerHTML = recent.map(historyCardHtml).join('');
    document.getElementById('history-all-list').innerHTML = hist.map(historyCardHtml).join('');
  } catch (e) {
    /* profile stats are non-critical */
  }
}

function historyCardHtml(h) {
  const date = h.created_at ? new Date(h.created_at).toLocaleDateString('vi-VN') : '';
  return `<div class="card"><div class="row between"><div><h3 style="font-size:14px;">${esc(h.title)}</h3><p class="meta">${date}${h.paid ? ' · Đã trả ' + fmtVnd(h.paid) : ''}</p></div><span class="tag teal">${h.status === 'done' ? 'Xong' : 'Đang mở'}</span></div></div>`;
}

/* wrap nav to lazy-load profile extras */
const _origNav = nav;
nav = function (id) {
  _origNav(id);
  if (id === 'PROFILE') loadProfileExtras();
  if (id === 'CREATE_EVENT') setDefaultEventTime();
};

/* ---------- Suggest ---------- */

async function openSuggest() {
  nav('SUGGEST_2');
  await runSuggest();
}

async function runSuggest() {
  document.getElementById('suggest-result').innerHTML = '<p class="meta">Đang chọn món...</p>';
  try {
    const result = await api.suggest(currentGroup.id, {});
    renderSuggestResult(result);
  } catch (e) {
    document.getElementById('suggest-result').innerHTML = `<div class="card"><p class="meta">${esc(e.message)}</p></div>`;
  }
}

function renderSuggestResult(result) {
  const picks = result.picks || [];
  if (picks.length === 0) {
    document.getElementById('suggest-result').innerHTML = `<div class="card card-tint-coral" style="text-align:center;">
      <div class="icon-chip coral" style="margin:0 auto;"><i data-lucide="chef-hat" style="width:22px;height:22px;color:var(--coral-dark);"></i></div>
      <h3 style="margin-top:10px;font-size:16px;">Đầu bếp chưa có gợi ý cho bạn</h3>
      <p class="meta">${esc(result.note || 'Nhóm chưa có quán nào được đánh giá trên 4 sao.')}</p>
    </div>`;
    refreshIcons();
    return;
  }
  let html = `<div class="card card-tint-coral" style="text-align:center;"><h3 style="font-size:18px;">Quán nhóm mình đánh giá cao nè!</h3><p class="meta">Chỉ chọn trong các quán trên 4 sao</p></div>`;
  picks.forEach((p) => {
    html += `<div class="card">
      <div class="row" style="gap:12px;"><div class="icon-chip coral"><i data-lucide="utensils" style="width:20px;height:20px;color:var(--coral-dark);"></i></div><div style="flex:1;"><h3>${esc(p.name)}</h3><p class="meta">★ ${p.avg_rating}${p.address ? ' · ' + esc(p.address) : ''}</p></div></div>
      <button class="btn btn-outline" style="margin-top:10px;" onclick="prefillAndGo('${esc(p.name)}')">Rủ mọi người ăn món này</button>
    </div>`;
  });
  html += `<button class="btn btn-teal" onclick="runSuggest()">Random lại</button>`;
  document.getElementById('suggest-result').innerHTML = html;
  refreshIcons();
}

function prefillAndGo(name) {
  nav('CREATE_EVENT');
  document.getElementById('event-title').value = name;
  toast('Đã điền sẵn: ' + name);
}

/* ---------- Boot ---------- */

(async function boot() {
  refreshIcons();
  try {
    await afterAuth();
  } catch (e) {
    nav('LOGIN');
  }
})();

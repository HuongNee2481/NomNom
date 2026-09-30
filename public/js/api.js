const api = (function () {
  async function request(method, path, body) {
    const res = await fetch('/api' + path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }
    if (!res.ok) {
      const err = new Error((data && data.error) || 'Có lỗi xảy ra');
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  return {
    register: (username, password, display_name) =>
      request('POST', '/auth/register', { username, password, display_name }),
    login: (username, password) => request('POST', '/auth/login', { username, password }),
    logout: () => request('POST', '/auth/logout'),
    me: () => request('GET', '/auth/me'),

    createGroup: (name, description) => request('POST', '/groups', { name, description }),
    joinGroup: (code) => request('POST', '/groups/join/' + encodeURIComponent(code)),
    groupInvite: (groupId) => request('GET', '/groups/' + groupId + '/invite'),
    groupMembers: (groupId) => request('GET', '/groups/' + groupId + '/members'),

    listEvents: (groupId) => request('GET', '/groups/' + groupId + '/events'),
    createEvent: (groupId, payload) => request('POST', '/groups/' + groupId + '/events', payload),
    getEvent: (eventId) => request('GET', '/events/' + eventId),
    joinEvent: (eventId) => request('POST', '/events/' + eventId + '/join'),
    saveBill: (eventId, items) => request('PUT', '/events/' + eventId + '/bill', { items }),
    setEventStatus: (eventId, status) => request('PUT', '/events/' + eventId + '/status', { status }),

    listPlaces: (groupId, excludeBlacklist) =>
      request('GET', '/groups/' + groupId + '/places' + (excludeBlacklist ? '?excludeBlacklist=1' : '')),

    vote: (eventId, stars) => request('POST', '/events/' + eventId + '/vote', { stars }),
    addBlacklist: (placeId) => request('POST', '/blacklist', { place_id: placeId }),
    removeBlacklist: (placeId) => request('DELETE', '/blacklist/' + placeId),

    suggest: (groupId, criteria) => request('POST', '/groups/' + groupId + '/suggest', criteria),

    history: () => request('GET', '/users/me/history'),
    stats: () => request('GET', '/users/me/stats'),
  };
})();

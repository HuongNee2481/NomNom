const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const session = require('express-session');

const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const eventRoutes = require('./routes/events');
const placeRoutes = require('./routes/places');
const ratingRoutes = require('./routes/ratings');
const suggestRoutes = require('./routes/suggest');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'nomnom-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 },
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api', eventRoutes);
app.use('/api', placeRoutes);
app.use('/api', ratingRoutes);
app.use('/api', suggestRoutes);
app.use('/api/users', userRoutes);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(PORT, () => {
  console.log(`NomNom server đang chạy tại http://localhost:${PORT}`);
});

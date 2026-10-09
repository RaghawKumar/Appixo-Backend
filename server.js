require('dotenv').config();
const express = require('express');
const cors = require('cors');
const guestUserRoutes = require('./routes/guestUser');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');
const { initializeDatabase } = require('./db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/guest', guestUserRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Server is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
initializeDatabase()
  .then(() => {
    console.log('Database initialized successfully');
  })
  .catch(error => {
    console.warn('Database initialization warning:', error.message);
    console.warn('Guest and Admin DB routes will require a valid database connection.');
  })
  .finally(() => {
    const PORT = process.env.PORT || 5001;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });


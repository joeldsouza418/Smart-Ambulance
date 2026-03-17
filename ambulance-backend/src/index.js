require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');

// Initialize App
const app = express();
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({ origin: '*' })); // Allows the React frontend to communicate
app.use(express.json()); // Parses incoming JSON requests

// Initialize Socket.IO Server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Socket.IO Logic
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Dispatchers join a specific "room" to get broadcase notifications
  socket.on('join_dispatch', () => {
    socket.join('dispatchers');
    console.log(`Socket ${socket.id} joined dispatcher room.`);
  });

  // Ambulances emit their live GPS coordinates
  socket.on('update_location', (data) => {
    // Expected data format: { ambulanceId: 'v123', lat: 40.71, lng: -74.00, status: 'en-route' }
    
    // Broadcast the updated location to dispatchers
    // In production, we might save this state to Redis or MongoDB occasionally too.
    io.to('dispatchers').emit('ambulance_location', data);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// REST Routes (Passing the io instance to routes)
const emergencyRoutes = require('./routes/emergencyRoutes');

app.use('/api/emergencies', emergencyRoutes(io));

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Ambulance Backend Engine Running', sockets: io.engine.clientsCount });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Node Server (Express + Socket.io) running on port ${PORT}`);
});

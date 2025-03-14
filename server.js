const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const MAX_ROOMS = Number(process.env.MAX_ROOMS || 1);
const MAX_ROOM_SIZE = Number(process.env.MAX_ROOM_SIZE || 2);
const SERVER_PORT = process.env.PORT || 3000;
const createdRooms = {};

io.on('connection', (socket) => {
    socket.on('join-room', ({ room, userName }, callback) => {
        if (Object.keys(createdRooms).length >= MAX_ROOMS && !createdRooms[room]) {
            return callback({ success: false, message: 'New room cannot be created. Please try after sometime.' });
        }

        if (!createdRooms[room]) {
            createdRooms[room] = [];
        }

        const nameExists = createdRooms[room].some(user => user.name === userName);
        if (nameExists) {
            return callback({ success: false, message: 'Name already exists in this room. Please choose a different name.' });
        }

        const existingUser = createdRooms[room].find(user => user.id === socket.id);
        if (existingUser) {
            existingUser.name = userName; // Update name if user already exists
        } else {
            if (createdRooms[room] && createdRooms[room].length >= MAX_ROOM_SIZE) {
                return callback({ success: false, message: `Room is Full! Only ${MAX_ROOM_SIZE} people are allowed in a room.` });
            }
            createdRooms[room].push({ id: socket.id, name: userName });
        }

        socket.join(room);
        io.to(room).emit('user-list', createdRooms[room]); // Broadcast updated list
        
        callback({ success: true });
    });

    socket.on('leave-room', (room) => {
        if (createdRooms[room]) {
            createdRooms[room] = createdRooms[room].filter(user => user.id !== socket.id);
            io.to(room).emit('user-list', createdRooms[room]);

            if (createdRooms[room].length === 0) {
                delete createdRooms[room]; // Delete room if empty
            }
        }
    });

    socket.on('disconnect', () => {
        for (const room in createdRooms) {
            createdRooms[room] = createdRooms[room].filter(user => user.id !== socket.id);
            io.to(room).emit('user-list', createdRooms[room]);
            if (createdRooms[room].length === 0) {
                delete createdRooms[room];
            }
        }
    });
});

// Start server on port 3000
server.listen(SERVER_PORT, () => {
  console.log(`Server running on port ${SERVER_PORT}`);
});

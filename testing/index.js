const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const httpServer = http.createServer(app);
const io = socketIO(httpServer);

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('A user connected');

  // Broadcast to all clients when a new user connects
  io.emit('user connected', socket.id);

  // Handle private messages
  socket.on('private message', (data) => {
    const { target, message } = data;
    io.to(target).emit('private message', { sender: socket.id, message });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
    // Broadcast to all clients when a user disconnects
    io.emit('user disconnected', socket.id);
  });
});

const server_port = process.env.PORT || 5000;
httpServer.listen(server_port, () => {
  console.log('Server is running on : ' + server_port);
});

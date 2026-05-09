const io = require('socket.io-client');

const socket = io('http://localhost:3001'); // incident-service WebSocket

socket.on('connect', () => {
  console.log('Connected to WebSocket');
});

socket.on('incident.created', (data) => {
  console.log('Received incident.created:', data);
});

socket.on('dispatch.assigned', (data) => {
  console.log('Received dispatch.assigned:', data);
});

socket.on('sos.triggered', (data) => {
  console.log('Received sos.triggered:', data);
});

socket.on('disconnect', () => {
  console.log('Disconnected from WebSocket');
});

// Keep the script running for a bit
setTimeout(() => {
  console.log('WebSocket test completed');
  socket.disconnect();
}, 10000);
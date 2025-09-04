// server.js
const express = require('express');
const { WebSocketServer } = require('ws');

const app = express();
const PORT = process.env.PORT || 8080;

// Lista delle connessioni WebSocket
const clients = new Map();

// WebSocket Server
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws, req) => {
  // Genera un ID unico per il client
  const id = Math.random().toString(36).substr(2, 6);
  clients.set(id, ws);
  console.log(`Client connesso: ${id}`);

  // Invia l'ID al client
  ws.send(JSON.stringify({ type: 'id', id }));

  // Gestisci i messaggi
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);

      // Inoltra messaggi tra peer
      if (msg.type === 'offer' || msg.type === 'answer' || msg.type === 'candidate') {
        const target = clients.get(msg.to);
        if (target && target.readyState === WebSocket.OPEN) {
          target.send(JSON.stringify({ ...msg, from: id }));
        } else {
          ws.send(JSON.stringify({
            type: 'error',
            message: `Destinatario ${msg.to} non raggiungibile`
          }));
        }
      }
    } catch (e) {
      console.error('Errore parsing messaggio:', e);
    }
  });

  ws.on('close', () => {
    console.log(`Client disconnesso: ${id}`);
    clients.delete(id);
  });

  ws.on('error', (err) => {
    console.error(`Errore WebSocket per ${id}:`, err);
  });
});

// Collega WebSocket a Express
const server = app.listen(PORT, () => {
  console.log(`Server in ascolto su porta ${PORT}`);
});

// Upgrade HTTP a WebSocket
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Endpoint di test
app.get('/', (req, res) => {
  res.send(`
    <h1>🟢 WebRTC Signaling Server</h1>
    <p>Server WebSocket attivo su <code>/</code></p>
    <p>Usa <code>ws://[questo-url]/</code> nel tuo Android.</p>
  `);
});

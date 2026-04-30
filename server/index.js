const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { randomUUID } = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// 8 hours in milliseconds
const INACTIVITY_TIMEOUT = 8 * 60 * 60 * 1000;

// rooms: Map<roomId, { players, revealed, ownerId, stories, currentStoryId, cleanupTimer, lastActivityAt }>
const rooms = new Map();

function getRoomState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  return {
    roomId,
    revealed: room.revealed,
    players: Array.from(room.players.values()),
    ownerId: room.ownerId,
    stories: room.stories,
    currentStoryId: room.currentStoryId,
  };
}

function computeScore(players) {
  const numericVotes = Array.from(players.values())
    .map(p => p.vote)
    .filter(v => v !== null && v !== '?' && v !== String.fromCodePoint(0x2615))
    .map(Number)
    .filter(n => !isNaN(n));
  if (numericVotes.length === 0) return null;
  const avg = Math.round((numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length) * 10) / 10;
  return String(avg);
}

// Update last activity timestamp for the room
function touchRoom(roomId) {
  const r = rooms.get(roomId);
  if (r) r.lastActivityAt = Date.now();
}

// Broadcast only to the room's own namespace - true channel isolation per room code
function broadcastRoom(roomId) {
  const state = getRoomState(roomId);
  if (state) {
    io.of('/room-' + roomId).emit('room_update', state);
  }
}

// Delete room and release namespace resources to prevent memory leaks
function destroyRoom(roomId) {
  const r = rooms.get(roomId);
  if (r && r.cleanupTimer) clearTimeout(r.cleanupTimer);
  rooms.delete(roomId);

  const nspName = '/room-' + roomId;
  const nsp = io.of(nspName);
  nsp.disconnectSockets(true);
  nsp.removeAllListeners();
  io._nsps.delete(nspName);
  console.log('[Room ' + roomId + '] destroyed');
}

// REST: create room
app.post('/api/rooms', (req, res) => {
  const roomId = randomUUID().slice(0, 8).toUpperCase();
  rooms.set(roomId, {
    players: new Map(),
    revealed: false,
    ownerId: null,
    stories: [],
    currentStoryId: null,
    cleanupTimer: null,
    lastActivityAt: Date.now(),
  });
  console.log('[Room ' + roomId + '] created');
  res.json({ roomId });
});

// REST: check room exists
app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  res.json({ exists: rooms.has(roomId) });
});

// ADMIN: list all rooms
app.get('/api/admin/rooms', (req, res) => {
  const list = Array.from(rooms.entries()).map(([roomId, r]) => ({
    roomId,
    players: r.players.size,
    revealed: r.revealed,
    stories: r.stories.length,
    lastActivityAt: r.lastActivityAt,
  }));
  res.json(list);
});

// ADMIN: delete (destroy) a room
app.delete('/api/admin/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  if (!rooms.has(roomId)) {
    return res.status(404).json({ error: 'Sala não encontrada.' });
  }
  destroyRoom(roomId);
  res.json({ ok: true });
});

// Dynamic namespace: one namespace per room
// Each room gets its own isolated socket channel: /room-ROOMID
// Clients MUST connect to their room namespace - events cannot leak across rooms.
const roomNsp = io.of(/^\/room-[A-Z0-9]{8}$/);

roomNsp.on('connection', (socket) => {
  const roomId = socket.nsp.name.replace('/room-', '');

  // Auto-create room if it doesn't exist (covers cases where HTTP call failed
  // and the client generated the roomId locally).
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      players: new Map(),
      revealed: false,
      ownerId: null,
      stories: [],
      currentStoryId: null,
      cleanupTimer: null,
      lastActivityAt: Date.now(),
    });
    console.log('[Room ' + roomId + '] auto-created on socket connection');
  }

  let playerName = null;
  let hasJoined = false;

  socket.on('join_room', ({ name }) => {
    if (!name) return;
    // Re-join from same socket (e.g. React StrictMode double-mount in dev):
    // just re-broadcast the current state so the client can recover.
    if (hasJoined) {
      broadcastRoom(roomId);
      return;
    }
    const r = rooms.get(roomId);
    if (!r) return; // should not happen after auto-create
    if (r.cleanupTimer) {
      clearTimeout(r.cleanupTimer);
      r.cleanupTimer = null;
    }
    playerName = String(name).slice(0, 30).trim();
    hasJoined = true;
    r.players.set(socket.id, { id: socket.id, name: playerName, vote: null });
    if (!r.ownerId) {
      r.ownerId = socket.id;
    }
    touchRoom(roomId);
    broadcastRoom(roomId);
    console.log('[Room ' + roomId + '] ' + playerName + ' joined (' + r.players.size + ' players)');
  });

  socket.on('vote', ({ vote }) => {
    if (!hasJoined) return;
    const r = rooms.get(roomId);
    if (!r || r.revealed) return;
    const player = r.players.get(socket.id);
    if (!player) return;
    player.vote = vote;
    touchRoom(roomId);
    broadcastRoom(roomId);
  });

  socket.on('reveal_votes', () => {
    if (!hasJoined) return;
    const r = rooms.get(roomId);
    if (!r) return;
    if (r.ownerId !== socket.id) {
      socket.emit('error', { message: 'Apenas quem criou a sala pode revelar as cartas.' });
      return;
    }
    r.revealed = true;
    if (r.currentStoryId) {
      const story = r.stories.find(s => s.id === r.currentStoryId);
      if (story) {
        const score = computeScore(r.players);
        story.score = score !== null ? score : '?';
      }
    }
    touchRoom(roomId);
    broadcastRoom(roomId);
  });

  socket.on('add_story', ({ title, description }) => {
    if (!hasJoined) return;
    const r = rooms.get(roomId);
    if (!r) return;
    if (r.ownerId !== socket.id) {
      socket.emit('error', { message: 'Apenas quem criou a sala pode adicionar historias.' });
      return;
    }
    const safeTitle = String(title || '').slice(0, 120).trim();
    const safeDescription = String(description || '').slice(0, 1000).trim();
    if (!safeTitle) {
      socket.emit('error', { message: 'Titulo da historia e obrigatorio.' });
      return;
    }
    const story = {
      id: randomUUID().slice(0, 8),
      title: safeTitle,
      description: safeDescription,
      score: null,
    };
    r.stories.push(story);
    if (!r.currentStoryId) {
      r.currentStoryId = story.id;
    }
    touchRoom(roomId);
    broadcastRoom(roomId);
  });

  socket.on('set_active_story', ({ storyId }) => {
    if (!hasJoined) return;
    const r = rooms.get(roomId);
    if (!r) return;
    if (r.ownerId !== socket.id) {
      socket.emit('error', { message: 'Apenas quem criou a sala pode mudar a historia ativa.' });
      return;
    }
    const story = r.stories.find(s => s.id === storyId);
    if (!story) {
      socket.emit('error', { message: 'Historia nao encontrada.' });
      return;
    }
    r.currentStoryId = storyId;
    touchRoom(roomId);
    broadcastRoom(roomId);
  });

  socket.on('remove_story', ({ storyId }) => {
    if (!hasJoined) return;
    const r = rooms.get(roomId);
    if (!r) return;
    if (r.ownerId !== socket.id) {
      socket.emit('error', { message: 'Apenas quem criou a sala pode remover historias.' });
      return;
    }
    r.stories = r.stories.filter(s => s.id !== storyId);
    if (r.currentStoryId === storyId) {
      r.currentStoryId = r.stories.length > 0 ? r.stories[r.stories.length - 1].id : null;
    }
    touchRoom(roomId);
    broadcastRoom(roomId);
  });

  socket.on('reset_votes', () => {
    if (!hasJoined) return;
    const r = rooms.get(roomId);
    if (!r) return;
    r.revealed = false;
    for (const player of r.players.values()) {
      player.vote = null;
    }
    touchRoom(roomId);
    broadcastRoom(roomId);
  });

  socket.on('chat_send', ({ text, toId }) => {
    if (!hasJoined) return;
    const r = rooms.get(roomId);
    if (!r) return;
    // Owner cannot use chat
    if (r.ownerId === socket.id) return;

    const safeText = String(text || '').slice(0, 500).trim();
    if (!safeText) return;
    touchRoom(roomId);

    const recipientId = toId || null;
    const recipientPlayer = recipientId ? r.players.get(recipientId) : null;

    const msg = {
      id: require('crypto').randomUUID().slice(0, 8),
      fromId: socket.id,
      fromName: playerName,
      text: safeText,
      toId: recipientId,
      toName: recipientPlayer ? recipientPlayer.name : null,
      isPrivate: !!recipientId,
      timestamp: Date.now(),
    };

    const nsp = io.of('/room-' + roomId);

    if (msg.isPrivate) {
      // Send only to sender and recipient (exclude owner)
      socket.emit('chat_message', msg);
      if (recipientId && recipientId !== r.ownerId) {
        nsp.to(recipientId).emit('chat_message', msg);
      }
    } else {
      // Broadcast to all players except owner
      for (const [pid] of r.players) {
        if (pid !== r.ownerId) {
          nsp.to(pid).emit('chat_message', msg);
        }
      }
    }
  });

  socket.on('leave_room', () => {
    handleLeave();
    socket.disconnect(true);
  });

  socket.on('disconnect', () => {
    handleLeave();
  });

  function handleLeave() {
    if (!hasJoined) return;
    hasJoined = false;
    const r = rooms.get(roomId);
    if (!r) return;
    const wasOwner = r.ownerId === socket.id;
    r.players.delete(socket.id);
    console.log('[Room ' + roomId + '] ' + playerName + ' left (' + r.players.size + ' players remaining)');
    if (r.players.size === 0) {
      if (r.cleanupTimer) clearTimeout(r.cleanupTimer);
      r.cleanupTimer = setTimeout(() => {
        const current = rooms.get(roomId);
        if (current && current.players.size === 0) {
          destroyRoom(roomId);
        }
      }, 5000);
    } else {
      if (wasOwner) {
        const nextPlayer = r.players.values().next().value;
        r.ownerId = nextPlayer ? nextPlayer.id : null;
        console.log('[Room ' + roomId + '] ownership transferred to ' + (nextPlayer ? nextPlayer.name : 'none'));
      }
      broadcastRoom(roomId);
    }
  }
});

// Periodic job: destroy rooms inactive for INACTIVITY_TIMEOUT (every 15 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms) {
    if (now - room.lastActivityAt >= INACTIVITY_TIMEOUT) {
      console.log('[Room ' + roomId + '] expired due to inactivity — destroying');
      destroyRoom(roomId);
    }
  }
}, 15 * 60 * 1000);

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log('Battle Poker server running on port ' + PORT);
});

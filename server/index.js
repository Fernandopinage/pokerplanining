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


// rooms: Map<roomId, { players: Map<socketId, Player>, revealed: boolean, ownerId: string|null, stories: Story[], currentStoryId: string|null }>
// Player: { id, name, vote: string | null }
// Story: { id, title, description, score: string|null }
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
    .filter(v => v !== null && v !== '?' && v !== '☕')
    .map(Number)
    .filter(n => !isNaN(n));
  if (numericVotes.length === 0) return null;
  const avg = Math.round((numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length) * 10) / 10;
  return String(avg);
}

function broadcastRoom(roomId) {
  const state = getRoomState(roomId);
  if (state) {
    io.to(roomId).emit('room_update', state);
  }
}

// REST: create room
app.post('/api/rooms', (req, res) => {
  const roomId = randomUUID().slice(0, 8).toUpperCase();
  // ownerId será definido no primeiro join_room
  rooms.set(roomId, { players: new Map(), revealed: false, ownerId: null, stories: [], currentStoryId: null });
  res.json({ roomId });
});

// REST: check room exists
app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  if (rooms.has(roomId)) {
    res.json({ exists: true });
  } else {
    res.json({ exists: false });
  }
});

io.on('connection', (socket) => {
  let currentRoom = null;
  let currentName = null;

  socket.on('join_room', ({ roomId, name }) => {
    if (!roomId || !name) return;

    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', { message: 'Sala não encontrada.' });
      return;
    }

    currentRoom = roomId;
    currentName = name;

    socket.join(roomId);

    room.players.set(socket.id, {
      id: socket.id,
      name,
      vote: null,
    });

    // Se for o primeiro jogador, define como owner
    if (!room.ownerId) {
      room.ownerId = socket.id;
    }

    broadcastRoom(roomId);
  });

  socket.on('vote', ({ vote }) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room || room.revealed) return;

    const player = room.players.get(socket.id);
    if (!player) return;

    player.vote = vote;
    broadcastRoom(currentRoom);
  });

  socket.on('reveal_votes', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    // Só o owner pode revelar
    if (room.ownerId !== socket.id) {
      socket.emit('error', { message: 'Apenas quem criou a sala pode revelar as cartas.' });
      return;
    }

    room.revealed = true;

    // Save score to current story when votes are revealed
    if (room.currentStoryId) {
      const story = room.stories.find(s => s.id === room.currentStoryId);
      if (story) {
        const score = computeScore(room.players);
        story.score = score !== null ? score : '?';
      }
    }

    broadcastRoom(currentRoom);
  });

  socket.on('add_story', ({ title, description }) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    if (room.ownerId !== socket.id) {
      socket.emit('error', { message: 'Apenas quem criou a sala pode adicionar histórias.' });
      return;
    }

    const safeTitle = String(title || '').slice(0, 120).trim();
    const safeDescription = String(description || '').slice(0, 1000).trim();

    if (!safeTitle) {
      socket.emit('error', { message: 'Título da história é obrigatório.' });
      return;
    }

    const story = {
      id: randomUUID().slice(0, 8),
      title: safeTitle,
      description: safeDescription,
      score: null,
    };

    room.stories.push(story);

    // Auto-set as current if none selected
    if (!room.currentStoryId) {
      room.currentStoryId = story.id;
    }

    broadcastRoom(currentRoom);
  });

  socket.on('set_active_story', ({ storyId }) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    if (room.ownerId !== socket.id) {
      socket.emit('error', { message: 'Apenas quem criou a sala pode mudar a história ativa.' });
      return;
    }

    const story = room.stories.find(s => s.id === storyId);
    if (!story) {
      socket.emit('error', { message: 'História não encontrada.' });
      return;
    }

    room.currentStoryId = storyId;
    broadcastRoom(currentRoom);
  });

  socket.on('remove_story', ({ storyId }) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    if (room.ownerId !== socket.id) {
      socket.emit('error', { message: 'Apenas quem criou a sala pode remover histórias.' });
      return;
    }

    room.stories = room.stories.filter(s => s.id !== storyId);

    if (room.currentStoryId === storyId) {
      room.currentStoryId = room.stories.length > 0 ? room.stories[room.stories.length - 1].id : null;
    }

    broadcastRoom(currentRoom);
  });

  socket.on('reset_votes', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    room.revealed = false;
    for (const player of room.players.values()) {
      player.vote = null;
    }
    broadcastRoom(currentRoom);
  });

  socket.on('disconnect', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    // Se o dono da sala desconectar, fecha a sala e desconecta todos os sockets dessa sala
    if (room.ownerId === socket.id) {
      // Envia evento para todos os sockets da sala informando que a sala foi fechada
      io.to(currentRoom).emit('room_closed');
      // Desconecta todos os sockets da sala
      const clients = Array.from(room.players.keys());
      for (const clientId of clients) {
        const clientSocket = io.sockets.sockets.get(clientId);
        if (clientSocket) {
          clientSocket.leave(currentRoom);
          clientSocket.disconnect(true);
        }
      }
      rooms.delete(currentRoom);
      return;
    }

    room.players.delete(socket.id);

    if (room.players.size === 0) {
      // Clean up empty rooms after a delay
      setTimeout(() => {
        const r = rooms.get(currentRoom);
        if (r && r.players.size === 0) {
          rooms.delete(currentRoom);
        }
      }, 60000);
    } else {
      broadcastRoom(currentRoom);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Battle Poker server running on port ${PORT}`);
});

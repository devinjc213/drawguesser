import {createServer} from "http";
import {Server} from "socket.io";
import express from "express";
import RoomController from "./controllers/room.controller";

//dont like this implementation, need to think of something better
//drawer needs to be a field and not stored separately in client and server
export type User = {
  socketId: string
  name: string
  score: number
  ready?: boolean
}

export type MessageType = {
  socketId: string
  name: string
  msg: string
  room: string
}

const app = express();

const server = createServer(app);

app.get("/:roomId", (req, res) => {
  const roomId = req.params.roomId;
  console.log(roomId);
});

export const io = new Server(server, {
	cors: {
		origin: "*",
	}
});

console.log('server starting');

const GameRoomState = new Map<string, RoomController>();

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

setInterval(() => {
  for (const room in GameRoomState) {
    if (GameRoomState.get(room)?.players.length === 0) {
      GameRoomState.delete(room);
      io.emit('room_update', getRoomData());
      console.log(`detected empty room... deleting ${room}`);
    }
  }
}, 1000);

io.on("connection", (socket) => {
	socket.join("lobby");
  console.log(`user ${socket.id} connected`);

	io.to(socket.id).emit('room_update', getRoomData());

  socket.on("message", (data) => {
    GameRoomState.get(data.roomId)?.handleMessage(data);
  });

	socket.on("canvas_emit", (data) => {
    if (data.type === "draw") {
      io.emit("canvas_emit", { 
        type: data.type,
        x: data.x, 
        y: data.y, 
        color: data.color, 
        brushSize: data.brushSize, 
        id: data.id 
      });
    } else if (data.type === "bucket") {
      io.emit("canvas_emit", {
        type: data.type,
        stack: data.stack,
        clickedColor: data.clickedColor,
        bucketColor: data.bucketColor
      });
    }
	});

	socket.on("clear_pos", (roomId: string) => {
		io.to(roomId).emit("clear_pos", true)
	});

	socket.on("clear_canvas", (roomId: string) => {
		io.to(roomId).emit("clear_canvas", true);
	});

	socket.on("create_room", (data: {
    name: string
    maxPlayers: number
    numberOfRounds: number
    roundTimer: number
    maxHints: number
    hintsEnabledAfter: number
    words: string
    playerName: string
  }) => {
    const roomId = generateId();
    socket.leave("lobby");
    socket.join(roomId);

    const controller = new RoomController(
      roomId,
      data.name,
      [{ name: data.playerName, socketId: socket.id, score: 0 }],
      data.maxPlayers,
      data.numberOfRounds,
      data.roundTimer,
      data.maxHints,
      data.hintsEnabledAfter,
      data.words.split(',').map((word: string) => word.trim())
    );

    GameRoomState.set(roomId, controller);

    console.log(`room created: ${data.name}`);
    console.log(`room id: ${roomId}`)
    console.log(data.name);
    io.to(socket.id).emit("create_join_room", { id: roomId, name: data.name });
    io.emit('room_update', getRoomData());
    io.to(socket.id).emit('players_in_room', GameRoomState.get(roomId)?.players);
	});

	socket.on("join_room", (data) => {
		socket.join(data.room);
		socket.leave("lobby");
		GameRoomState.get(data.room)?.playerJoined({ name: data.name, socketId: socket.id, score: 0 })
    console.log(`user ${data.name} joined room: ${data.room}`);
	});

  socket.on('player_ready', data => {
    GameRoomState.get(data.room)?.playerReady(socket.id);
  });

	socket.on('start_game', data => {
		GameRoomState.get(data.room)?.game.gameStart();
	});

  socket.on('selected_word', data => {
    GameRoomState.get(data.room)?.game.setSelectedWord(data.word);
  });

  socket.on('give_hint', data => {
    GameRoomState.get(data.room)?.game.handleHint();
  });

  socket.on('leave_room', data => {
    GameRoomState.get(data.room)?.playerLeft(socket.id);
    io.to(socket.id).emit('room_update', getRoomData());
  });

  socket.on('play_again', data => {
    GameRoomState.get(data.room)?.game.playAgain();
  });

  socket.on('disconnecting', () => {
    const room = Array.from(socket.rooms)[1];
    if (room !== "lobby") GameRoomState.get(room)?.playerLeft(socket.id);
    console.log(`user ${socket.id} disconnected from room: ${room}`);
  });
});

function getRoomData() {
  const rooms = [];

  for (const room of GameRoomState.values()) {
    rooms.push({
      id: room.id,
      name: room.name,
      players: room.players,
      drawer: room.drawer,
      gameStarted: room.game.gameIsStarted,
      roundStarted: room.game.roundIsStarted,
      currentRound: room.game.currentRound,
      numberOfRounds: room.numberOfRounds,
    })
  }

  return rooms;
}

server.listen(4000);
app.listen(3001);

module.exports = {
	io,
}

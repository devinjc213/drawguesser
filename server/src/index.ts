import {createServer} from "http";
import {Server} from "socket.io";
import express from "express";
import RoomController from "./controllers/room.controller";
import {isDrawer} from "./utils";
import cors from "cors";
require('dotenv').config();

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

const isProd = process.env.NODE_ENV === 'prod';
const origin = isProd ? "https://drawguesser.devsdev.dev" : "http://localhost:3000";

app.use(cors({
  origin,
  credentials: true
}))

const server = createServer(app);

export const io = new Server(server, {
	cors: {
		origin,
    methods: ["GET", "POST"],
    credentials: true
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
    GameRoomState.get(data.room)?.handleMessage(data);
  });

	socket.on("canvas_emit", (data) => {
    const drawerFromRoom = GameRoomState.get(data.roomId)?.drawer.socketId;

    if (isDrawer(drawerFromRoom ?? '', socket.id)) {
      if (data.type === "draw") {
        io.to(data.roomId).emit("canvas_emit", { 
          type: data.type,
          x: data.x, 
          y: data.y, 
          color: data.color, 
          brushSize: data.brushSize, 
          drawerId: data.drawerId 
        });
      } else if (data.type === "bucket") {
        io.to(data.roomId).emit("canvas_emit", {
          type: data.type,
          stack: data.stack,
          clickedColor: data.clickedColor,
          bucketColor: data.bucketColor,
          drawerId: data.drawerId
        });
      }
    }
	});

	socket.on("clear_pos", (roomId: string) => {
    const drawerFromRoom = GameRoomState.get(roomId)?.drawer.socketId;

    if (isDrawer(drawerFromRoom ?? '', socket.id)) {
      io.to(roomId).emit("clear_pos", true)
    }
	});

	socket.on("clear_canvas", (roomId: string) => {
    const drawerFromRoom = GameRoomState.get(roomId)?.drawer.socketId;

    if (isDrawer(drawerFromRoom ?? '', socket.id)) {
      io.to(roomId).emit("clear_canvas", socket.id);
    }
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

  socket.on('undo', () => {
    io.emit('undo', true);
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

server.listen(process.env.PORT ?? 3009);

module.exports = {
	io,
}

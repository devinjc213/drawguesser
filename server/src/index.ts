import {createServer} from "http";
import {Server} from "socket.io";
import express from "express";
import GameController from './GameController';

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

const GameRoomState = new Map<string, GameController>();

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

setInterval(() => {
  for (const game in GameRoomState) {
    if (GameRoomState.get(game)?.players.length === 0) {
      GameRoomState.delete(game);
      io.emit('room_update', Object.keys(GameRoomState));
      console.log(`detected empty room... deleting ${game}`);
    }
  }
}, 1000);

io.on("connection", (socket) => {
	socket.join("lobby");
  console.log(`user ${socket.id} connected`);

	io.to(socket.id).emit('initial_rooms', Object.keys(GameRoomState));

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

	socket.on("clear_pos", (clearPos) => {
		io.emit("clear_pos", clearPos)
	});

	socket.on("clear_canvas", (clearCanvas) => {
		io.emit("clear_canvas", clearCanvas);
	});

	socket.on("create_room", (data: {
    roomId: string
    name: string
    playerName: string
    roundTimer: number
    numberOfRounds: number
    maxNumberOfPlayers: number
    maxHintsGiven: number
    hintEnabledAfter: number
    words: string
  }) => {
		socket.join(data.name);
		socket.leave("lobby");
		io.to(socket.id).emit("create_join_room", data.roomId);
    console.log(data.playerName);

    const roomId = generateId();

    const controller = new GameController(
      roomId,
      data.name,
      [{ name: data.playerName, socketId: socket.id, score: 0 }],
      socket,
      data.roundTimer,
      data.numberOfRounds,
      data.maxNumberOfPlayers,
      data.maxHintsGiven,
      data.hintEnabledAfter,
      data.words.split(',').map((word: string) => word.trim())
    );

    GameRoomState.set(roomId, controller);

    console.log(`room created: ${data.name}`);

    io.emit('room_update', Object.keys(GameRoomState));
    io.to(socket.id).emit('players_in_room', GameRoomState.get(data.roomId)?.players);
	});

	socket.on("join_room", (data) => {
		socket.join(data.roomId);
		socket.leave("lobby");
		io.to(data.roomId).emit('user_joined', data.name);
		GameRoomState.get(data.roomId)?.playerJoined({ name: data.name, socketId: socket.id, score: 0 })
    console.log(`user ${data.name} joined room: ${data.roomId}`);
	});

  socket.on('player_ready', data => {
    GameRoomState.get(data.roomId)?.playerReady(socket.id);
  });

	socket.on('start_game', data => {
		GameRoomState.get(data.roomId)?.gameStart();
	});

  socket.on('selected_word', data => {
    GameRoomState.get(data.roomId)?.setSelectedWord(data.word);
  });

  socket.on('give_hint', data => {
    GameRoomState.get(data.roomId)?.handleHint();
  });

  socket.on('leave_room', data => {
    ///////////////
    GameRoomState.get(data.roomId)?.playerLeft(socket.id);
    io.to(socket.id).emit('room_update', Object.keys(GameRoomState));
  });

  socket.on('play_again', data => {
    GameRoomState.get(data.roomId)?.playAgain();
  });

  socket.on('disconnecting', () => {
    const room = Array.from(socket.rooms)[1];
    if (room !== "lobby") GameRoomState.get(room)?.playerLeft(socket.id);
    console.log(`user ${socket.id} disconnected from room: ${room}`);
  });
});

server.listen(4000);
app.listen(3001);

module.exports = {
	io,
}

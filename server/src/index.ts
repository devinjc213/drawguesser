import { createServer } from "http";
import { Server } from "socket.io";
import GameController from './GameController';

//dont like this implementation, need to think of something better
//drawer needs to be a field and not stored separately in client and server
export type User = {
  [key: string]: {
    name: string 
    score: number
    ready?: boolean
  }
}

export type MessageType = {
  socketId: string
  name: string
  msg: string
  room: string
}

type GameRoomType = {
	[key: string]: GameController
}

const httpServer = createServer();

export const io = new Server(httpServer, {
	cors: {
		origin: "*"
	}
});

let GameRoomState: GameRoomType = {};

setInterval(() => {
  for (const game in GameRoomState) {
    if (GameRoomState[game].players.length === 0) {
      delete GameRoomState[game]
      io.emit('room_update', Object.keys(GameRoomState));
      console.log(`detected empty room... deleting ${game}`);
    }
  }
}, 1000);

io.on("connection", (socket) => {
	socket.join("lobby");

	io.to(socket.id).emit('initial_rooms', Object.keys(GameRoomState));

  socket.on("message", (data) => {
    GameRoomState[data.room].handleMessage(data);
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

	socket.on("create_room", (data) => {
		socket.join(data.room);
		socket.leave("lobby");
		io.to(socket.id).emit("create_join_room", data.room);

		const game = new GameController(data.room, [{ [socket.id]: { name: data.name, score: 0 } }], socket);
		GameRoomState[data.room] = game;

    console.log(`room created: ${data.room}`);

    io.emit('room_update', Object.keys(GameRoomState));
    io.to(socket.id).emit('players_in_room', GameRoomState[data.room].players);
	});

	socket.on("join_room", (data) => {
		socket.join(data.room);
		socket.leave("lobby");
		io.to(data.room).emit('user_joined', data.name);
		GameRoomState[data.room].playerJoined({ [socket.id]: { name: data.name, score: 0 } })
    console.log(`user ${data.name} joined room: ${data.room}`);
	});

  socket.on('player_ready', data => {
    GameRoomState[data.room].playerReady(socket.id);
  });

	socket.on('start_game', data => {
		GameRoomState[data.room].gameStart();			
	});

  socket.on('selected_word', data => {
    GameRoomState[data.room].setSelectedWord(data.word);
  });

  socket.on('give_hint', data => {
    GameRoomState[data.room].handleHint();
  })

  socket.on('leave_room', data => {
    GameRoomState[data.room].playerLeft(socket.id);
    io.to(socket.id).emit('room_update', Object.keys(GameRoomState));
  })

  socket.on('disconnecting', () => {
    const room = Array.from(socket.rooms)[1];
    if (room !== "lobby") GameRoomState[room].playerLeft(socket.id);
    console.log(`user ${socket.id} disconnected from room: ${room}`);
  });
});

httpServer.listen(4000);

module.exports = {
	io,
}

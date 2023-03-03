import { createServer } from "http";
import { Server } from "socket.io";
import GameController from './gameController';

export type UserAndSocket = { [key: string]: string };
export type MessageType = { socketId: string, name: string, msg: string, room: string };

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

io.on("connection", (socket) => {
	socket.join("lobby");
	//user joins their own room when connecting for some reason so we have to filter from room list

	io.to(socket.id).emit('initial_rooms', Object.keys(GameRoomState));

	socket.on("message", (data) => {
		GameRoomState[data.room].handleMessage(data);
	});

	socket.on("canvas_emit", (data) => {
		io.emit("canvas_emit", { 
			x: data.x, 
			y: data.y, 
			color: data.color, 
			brushSize: data.brushSize, 
			id: data.id 
		});
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

		const game = new GameController(data.room, [{ [socket.id]: data.name }], socket);
		GameRoomState[data.room] = game;
	
    io.emit('room_update', Object.keys(GameRoomState));
	});

	socket.on("join_room", (data) => {
		socket.join(data.room);
		socket.leave("lobby");
		io.to(data.room).emit('user_joined', data.name);
		GameRoomState[data.room].playerJoined({ [socket.id]: data.name })
	});

	socket.on('start_game', data => {
		GameRoomState[data.room].roundStart();			
	});

  socket.on('leave_room', data => {
    GameRoomState[data.room].playerLeft(socket.id);
    io.to(socket.id).emit('room_update', Object.keys(GameRoomState));
  })

  socket.on('disconnecting', () => {
    const room = Array.from(socket.rooms)[1];
    if (room !== "lobby") GameRoomState[room].playerLeft(socket.id); 
  });

  socket.on('disconnect', () => {
    for (const game in GameRoomState) {
      if (GameRoomState[game].players.length === 0) {
        delete GameRoomState[game]
        io.emit('room_update', Object.keys(GameRoomState));
      }
    }
  });
});

httpServer.listen(4000);

module.exports = {
	io,
}

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
	const clients = Array.from(io.sockets.sockets.keys());
	const rooms = Array.from(io.sockets.adapter.rooms.keys()).filter(room => !clients.includes(room));

	io.emit('room_update', rooms);

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


		const rooms = Array.from(io.sockets.adapter.rooms.keys())
      .filter(room => !clients.includes(room));
		
    io.emit('room_update', rooms);
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

  socket.on('disconnecting', () => {
    const room = Array.from(socket.rooms)[1];
    GameRoomState[room].playerLeft(socket.id); 
  });

  socket.on('disconnect', () => {
    for (const game in GameRoomState) {
      if (GameRoomState[game].players.length === 0) {
        delete GameRoomState[game]
      }
    }
  });
});

httpServer.listen(4000);

module.exports = {
	io,
}

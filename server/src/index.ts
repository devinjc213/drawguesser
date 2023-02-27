import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, {
	cors: {
		origin: "*"
	}
});

io.on("connection", (socket) => {
	socket.join("lobby");
	//user joins their own room when connecting for some reason so we have to filter from room list
	const clients = Array.from(io.sockets.sockets.keys());
	const rooms = Array.from(io.sockets.adapter.rooms.keys()).filter(room => !clients.includes(room));

	io.emit('room_update', rooms);

	socket.on("message", (data) => {
		io.to(data.room).emit("message", { name: data.name, msg: data.msg });
	});
	socket.on("canvas_emit", (data) => {
		io.emit("canvas_emit", { x: data.x, y: data.y, color: data.color, id: data.id });
	});
	socket.on("clear_pos", (clearPos) => {
		io.emit("clear_pos", clearPos)
	})
	socket.on("create_room", (room) => {
		socket.join(room);
		socket.leave("lobby");
		io.to(socket.id).emit("create_join_room", room);

		const rooms = Array.from(io.sockets.adapter.rooms.keys()).filter(room => !clients.includes(room));

		io.emit('room_update', rooms);
	});
	socket.on("join_room", (room) => {
		socket.join(room);
		socket.leave("lobby");
	})
});

io.on("disconnect", (socket) => {
	console.log("disconnect");
});

httpServer.listen(4000);

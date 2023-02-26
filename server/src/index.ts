import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, {
	cors: {
		origin: "*"
	}
});

io.on("connection", (socket) => {
	console.log(socket.id);
	socket.on("message", (msg) => {
		io.emit("message", msg);	
	});
	socket.on("canvas_emit", (data) => {
		io.emit("canvas_emit", { x: data.x, y: data.y, color: data.color, id: data.id });
	});
	socket.on("clear_pos", (clearPos) => {
		io.emit("clear_pos", clearPos)
	})
});

io.on("disconnect", (socket) => {
	console.log("disconnect");
});

httpServer.listen(4000);

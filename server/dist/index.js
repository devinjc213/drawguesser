"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const GameController_1 = __importDefault(require("./GameController"));
const httpServer = (0, http_1.createServer)();
exports.io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*"
    }
});
let GameRoomState = {};
setInterval(() => {
    for (const game in GameRoomState) {
        if (GameRoomState[game].players.length === 0) {
            delete GameRoomState[game];
            exports.io.emit('room_update', Object.keys(GameRoomState));
            console.log(`detected empty room... deleting ${game}`);
        }
    }
}, 1000);
exports.io.on("connection", (socket) => {
    socket.join("lobby");
    exports.io.to(socket.id).emit('initial_rooms', Object.keys(GameRoomState));
    socket.on("message", (data) => {
        GameRoomState[data.room].handleMessage(data);
    });
    socket.on("canvas_emit", (data) => {
        if (data.type === "draw") {
            exports.io.emit("canvas_emit", {
                type: data.type,
                x: data.x,
                y: data.y,
                color: data.color,
                brushSize: data.brushSize,
                id: data.id
            });
        }
        else if (data.type === "bucket") {
            exports.io.emit("canvas_emit", {
                type: data.type,
                stack: data.stack,
                clickedColor: data.clickedColor,
                bucketColor: data.bucketColor
            });
        }
    });
    socket.on("clear_pos", (clearPos) => {
        exports.io.emit("clear_pos", clearPos);
    });
    socket.on("clear_canvas", (clearCanvas) => {
        exports.io.emit("clear_canvas", clearCanvas);
    });
    socket.on("create_room", (data) => {
        socket.join(data.name);
        socket.leave("lobby");
        exports.io.to(socket.id).emit("create_join_room", data.name);
        GameRoomState[data.name] = new GameController_1.default(data.name, [{ [socket.id]: { name: data.name, score: 0 } }], socket, data.roundTimer, data.numberOfRounds, data.maxNumberOfPlayers, data.maxHintsGiven, data.hintEnabledAfter, data.words.split(',').map((word) => word.trim()));
        console.log(`room created: ${data.name}`);
        exports.io.emit('room_update', Object.keys(GameRoomState));
        exports.io.to(socket.id).emit('players_in_room', GameRoomState[data.name].players);
    });
    socket.on("join_room", (data) => {
        socket.join(data.room);
        socket.leave("lobby");
        exports.io.to(data.room).emit('user_joined', data.name);
        GameRoomState[data.room].playerJoined({ [socket.id]: { name: data.name, score: 0 } });
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
    });
    socket.on('leave_room', data => {
        GameRoomState[data.room].playerLeft(socket.id);
        exports.io.to(socket.id).emit('room_update', Object.keys(GameRoomState));
    });
    socket.on('disconnecting', () => {
        const room = Array.from(socket.rooms)[1];
        if (room !== "lobby")
            GameRoomState[room].playerLeft(socket.id);
        console.log(`user ${socket.id} disconnected from room: ${room}`);
    });
});
httpServer.listen(4000);
module.exports = {
    io: exports.io,
};

//game loop
//round start -> round end -> next round 
import type { Socket } from "socket.io";

export default function GameController(room: string, clients: string[], socket: Socket) {
	let numberOfPlayers = clients.length;
	let drawer = clients[0];
	let currentRound = 1;
	let roundTimer = 45;
	let intermissionTimer = 10;
	let numberOfRounds = 3;
	let words = ["apple"];

	while (currentRound <= numberOfRounds) {
		roundStart(roundTimer, room, socket);		
	}
};

function roundStart(roundTimer: number, room: string, socket: Socket) {
	let currentRoundTimer = roundTimer;
	while (currentRoundTimer > 0) {
		socket.io.to(room).emit('round_timer', currentRoundTimer);
		setTimeout(() => { currentRoundTimer -= 1 }, 1000);
	}
};

function roundEnd() {};

function intermission() {};

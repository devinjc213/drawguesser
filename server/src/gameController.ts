//game loop
//round start -> round end -> next round
import { io, UserAndSocket, MessageType } from './index';
import type { Socket } from 'socket.io'

export default class GameController {
	private room: string;
	private clients: UserAndSocket[];
	private socket: Socket;
	private numberOfPlayers: number;
	private drawer: UserAndSocket;
	private roundIsStarted: boolean;
	private currentRound: number;
	private roundTimer: number;
	private currentRoundTimer;
	private intermissionTimer: number;
	private numberOfRounds: number;
	private words: string[]
	private interval: any;

	constructor(room: string, clients: UserAndSocket[], socket: Socket) {
		this.room = room;
		this.clients = clients;
		this.socket = socket;
		this.numberOfPlayers = 8;
		this.drawer = clients[0];
		this.roundIsStarted = false;
		this.currentRound = 1;
		this.roundTimer = 45;
		this.currentRoundTimer = this.roundTimer;
		this.intermissionTimer = 10;
		this.numberOfRounds = 3;
		this.words = ["apple"];
		this.interval = null;
	}

	countdown() {	
		if (this.currentRoundTimer > 0) this.currentRoundTimer -= 1;
		else {
			clearInterval(this.interval);
			this.roundEnd();
		}
		
		io.to(this.room).emit('round_timer', this.currentRoundTimer);
	}

	handleMessage({ name, msg, room }: MessageType) {
		if (!this.roundIsStarted) {
			io.to(room).emit("message", { name, msg });
		} else {
			if (msg === this.words[0]) {
				io.to(this.room).emit('word_guessed', `${name} guessed the word!`);
			} else {
				io.to(room).emit("message", { name, msg });
			}	
		}
	} 
	
	roundStart() {
		console.log('round start');
		this.roundIsStarted = true;
		this.interval = setInterval(this.countdown.bind(this), 1000);
		this.countdown();
		io.to(this.room).emit('round_start', {
			drawer: this.drawer,
			msg: `Round has started. ${Object.values(this.drawer)[0]} is drawing`
		});
	}


	intermission() {}
	roundEnd() {
		this.currentRoundTimer = this.roundTimer;
	}
}


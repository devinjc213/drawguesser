import { io, UserAndSocket, MessageType } from './index';
import type { Socket } from 'socket.io'

export default class GameController {
	private room: string;
	public players: UserAndSocket[];
	private socket: Socket;
	private maxNumberOfPlayers: number;
	private drawer: UserAndSocket;
	private roundIsStarted: boolean;
	private currentRound: number;
	private roundTimer: number;
	private currentRoundTimer: number;
	private intermissionTimer: number;
	private currentIntermissionTimer: number;
	private numberOfRounds: number;
	private words: string[];
  private playersGuessedCorrect: UserAndSocket[];
	private interval: any;

	constructor(room: string, players: UserAndSocket[], socket: Socket) {
		this.room = room;
		this.players = players;
		this.socket = socket;
		this.maxNumberOfPlayers = 8;
		this.drawer = players[0];
		this.roundIsStarted = false;
		this.currentRound = 1;
		this.roundTimer = 15;
		this.currentRoundTimer = this.roundTimer;
		this.intermissionTimer = 10;
		this.currentIntermissionTimer = this.intermissionTimer;
		this.numberOfRounds = 3;
		this.words = ["apple"];
    this.playersGuessedCorrect = [];
		this.interval = null;


    io.to(this.room).emit('players_in_room', this.drawer);
	}

	countdown(cdType: "round" | "intermission") {	
    if (cdType === "round") {
      if (this.currentRoundTimer > 0) this.currentRoundTimer -= 1;
      else {
        clearInterval(this.interval);
        this.roundEnd();
      }

      io.to(this.room).emit('round_timer', this.currentRoundTimer);

    } else if (cdType === "intermission") { 
      if (this.currentIntermissionTimer > 0) this.currentIntermissionTimer -= 1;
      else {
        clearInterval(this.interval);
        this.roundStart();
      }

      io.to(this.room).emit('intermission_timer', this.currentIntermissionTimer);
    
    }
	}

	handleMessage({ socketId, name, msg, room }: MessageType) {
		if (!this.roundIsStarted) {
			io.to(room).emit("message", { name, msg });
		} else {
			if (msg === this.words[0]) {
				io.to(this.room).emit('server_message', `${name} guessed the word!`);
        this.playersGuessedCorrect.push({ [socketId]: name });
        if (this.playersGuessedCorrect.length === this.players.length) {
          io.to(this.room).emit('server_message', 'All users have guessed the word!');
        }
			} else {
				io.to(room).emit("message", { name, msg });
			}	
		}
	} 

	shuffle(array: UserAndSocket[] | []) {
		let currentIndex = array.length;
		let randomIndex: number;
		while (currentIndex != 0) {
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex--;

			[array[currentIndex], array[randomIndex]] = [
				array[randomIndex], array[currentIndex]];
		}

		return array;
	}

	playerJoined(player: UserAndSocket) {
		this.players = [...this.players, player];
    io.to(this.room).emit('players_in_room', this.players);
	}
  
  playerLeft(id: string) {
    const playerIndex = this.players.findIndex(player => Object.keys(player)[0] === id);

    if (this.drawer === this.players[playerIndex] && playerIndex < this.players.length - 1) {
      this.drawer = this.players[playerIndex + 1];
    } else {
      this.drawer = this.players[0];
    }

    this.players = this.players.filter(player => Object.keys(player)[0] !== id);
    io.to(this.room).emit('players_in_room', this.players);
  }

	roundStart() {
		this.roundIsStarted = true;
    this.currentIntermissionTimer = this.intermissionTimer;
		this.interval = setInterval(this.countdown.bind(this, "round"), 1000);
		this.players = this.shuffle(this.players);
		this.countdown("round");
		io.to(this.room).emit('round_start', {
			drawer: this.drawer,
			msg: `Round has started. ${Object.values(this.drawer)[0]} is drawing`
		});
	}


	intermission() {
    if (this.playersGuessedCorrect.length > 0) {
      io.to(this.room).emit('server_message', `${Object.values(this.playersGuessedCorrect)
        .join(', ')} guessed correctly!`);
    }
    this.interval = setInterval(this.countdown.bind(this, "intermission"), 1000);
    this.countdown("intermission");
    io.to(this.room).emit('intermission_timer', this.currentIntermissionTimer);
    this.playersGuessedCorrect = [];
  }

	roundEnd() {
		this.currentRoundTimer = this.roundTimer;
    this.intermission();
    this.currentRound++;
    io.to(this.room).emit('round_end', this.currentRound);
	}
}


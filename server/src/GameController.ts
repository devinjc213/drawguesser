import { io, User, MessageType } from './index';
import type { Socket } from 'socket.io'
const fs = require('fs');

export default class GameController {
	private room: string;
	public players: User[];
	private socket: Socket;
	private maxNumberOfPlayers: number;
	private drawer: User;
	private roundIsStarted: boolean;
	private currentRound: number;
	private roundTimer: number;
	private currentRoundTimer: number;
	private intermissionTimer: number;
	private currentIntermissionTimer: number;
	private numberOfRounds: number;
	private words: string[];
  private selectedWord: string;
  private playersGuessedCorrect: User[];
	private interval: any;

	constructor(room: string, players: User[], socket: Socket) {
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
		this.words = JSON.parse(fs.readFileSync(__dirname + '/1000_words.json', 'utf8')); 
    this.selectedWord = "";
    this.playersGuessedCorrect = [];
		this.interval = null;

    io.to(this.room).emit('room_init', this.drawer);
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
    if (this.roundIsStarted && socketId === Object.keys(this.drawer)[0]) return;

		if (!this.roundIsStarted) {
			io.to(room).emit("message", { name, msg });
		} else {
			if (msg === this.words[0]) {
				io.to(this.room).emit('server_message', `${name} guessed the word!`);
        this.playersGuessedCorrect.push({ [socketId]: { name } });
        if (this.playersGuessedCorrect.length === this.players.length) {
          io.to(this.room).emit('server_message', 'All users have guessed the word!');
          this.roundEnd();
        }
			} else if (!Object.keys(this.playersGuessedCorrect).includes(socketId)) {
				io.to(room).emit("message", { name, msg });
			}	
		}
	} 

	shuffle(array: User[] | []) {
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

	playerJoined(player: User) {
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

  playerReady(id: string) {
    const playerIndex = this.players.findIndex(player => Object.keys(player)[0] === id);
    this.players[playerIndex][id].ready = !this.players[playerIndex][id].ready;
    io.to(this.room).emit('players_in_room', this.players);
    if (this.players.findIndex(player => !Object.values(player)[0].ready) === -1) {
      io.to(Object.keys(this.drawer)[0]).emit('can_start', true);
    } else {
      io.to(Object.keys(this.drawer)[0]).emit('can_start', false);
    }
  }

  pickDrawWord() {
    const drawWords: string[] = [];
    while (drawWords.length < 4) {
      drawWords.push(this.words[Math.floor(Math.random() * this.words.length)])
    }
    console.log(drawWords);
  }

	roundStart() {
    this.pickDrawWord();
    this.players.forEach(player => player[Object.keys(player)[0]].ready = false);
    io.to(this.room).emit('players_in_room', this.players);
		this.roundIsStarted = true;
    this.currentIntermissionTimer = this.intermissionTimer;
		this.interval = setInterval(this.countdown.bind(this, "round"), 1000);
		this.players = this.shuffle(this.players);
		this.countdown("round");
		io.to(this.room).emit('round_start', {
			drawer: this.drawer,
			msg: `Round has started. ${Object.values(this.drawer)[0].name} is drawing`
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


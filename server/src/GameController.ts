import { io, User, MessageType } from './index';
import type { Socket } from 'socket.io'
const fs = require('fs');

export default class GameController {
	private room: string;
	public players: User[];
	private socket: Socket;
	private maxNumberOfPlayers: number;
	private drawer: User;
  private gameIsStarted: boolean;
	private roundIsStarted: boolean;
	private currentRound: number;
	private roundTimer: number;
	private currentRoundTimer: number;
	private chooseDrawWordTimer: number;
	private currentChooseDrawWordTimer: number;
  private roundStartTime: number;
  private currentRoundStartTime: number;
	private numberOfRounds: number;
	private words: string[];
  private wordsToDraw: string[];
  private selectedWord: string;
  private playersGuessedCorrect: User[];
	private interval: any;

	constructor(room: string, players: User[], socket: Socket) {
		this.room = room;
		this.players = players;
		this.socket = socket;
		this.maxNumberOfPlayers = 8;
		this.drawer = players[0];
    this.gameIsStarted = false;
		this.roundIsStarted = false;
		this.currentRound = 1;
		this.roundTimer = 80;
		this.currentRoundTimer = this.roundTimer;
		this.chooseDrawWordTimer= 15;
		this.currentChooseDrawWordTimer = this.chooseDrawWordTimer;
    this.roundStartTime = 5;
    this.currentRoundStartTime = this.roundStartTime;
		this.numberOfRounds = 3;
		this.words = JSON.parse(fs.readFileSync(__dirname + '/1000_words.json', 'utf8')); 
    this.wordsToDraw = [];
    this.selectedWord = "";
    this.playersGuessedCorrect = [];
		this.interval = null;

    io.to(this.room).emit('drawer_update', this.drawer);
	}

  //countdowns for the game round, picking a word to draw, and start countdown 
	countdown(cdType: "round" | "chooseDrawWord" | "3sec") {	
    if (cdType === "round") {
      if (this.currentRoundTimer > 0) this.currentRoundTimer -= 1;
      else {
        clearInterval(this.interval);
        this.interval = null;
        this.drawRoundEnd();
      }

      io.to(this.room).emit('round_timer', this.currentRoundTimer);

    } else if (cdType === "chooseDrawWord") { 
      if (this.currentChooseDrawWordTimer > 0) {
        if (!this.selectedWord) this.currentChooseDrawWordTimer -= 1;
        else {
          clearInterval(this.interval);
          this.interval = setInterval(this.countdown.bind(this, "3sec"), 1000);
          this.countdown("3sec");
        }
      } else {
        this.setSelectedWord(this.wordsToDraw[Math.floor(Math.random()
          * this.wordsToDraw.length)]);
        
        clearInterval(this.interval);
        this.interval = setInterval(this.countdown.bind(this, "3sec"), 1000);
        this.countdown("3sec");
      }

      io.to(this.room).emit('intermission_timer', this.currentChooseDrawWordTimer);
    } else if (cdType === "3sec") {
      if (this.currentRoundStartTime > 0) this.currentRoundStartTime -= 1;
      else {
        clearInterval(this.interval);
        this.interval = null;
        this.drawRoundStart();
      }

      io.to(this.room).emit('intermission_timer', this.currentRoundStartTime);
    }
	}

  //Dont let drawer type, add a correct guess to array, end round if all 
  //users have guessed
	handleMessage({ socketId, name, msg, room }: MessageType) {
    if (this.roundIsStarted && socketId === Object.keys(this.drawer)[0]) return;

		if (!this.roundIsStarted) {
			io.to(room).emit("message", { name, msg });
		} else {
			if (msg === this.selectedWord) {
				io.to(this.room).emit('server_message', `${name} guessed the word!`);

        this.playersGuessedCorrect.push({ [socketId]: { name } });
        
        if (this.playersGuessedCorrect.length === this.players.length - 1) {
          io.to(this.room).emit('server_message', 'All users have guessed the word!');
         
          this.drawRoundEnd();
        }
			} else if (!Object.keys(this.playersGuessedCorrect).includes(socketId)) {
				io.to(room).emit("message", { name, msg });
			}	
		}
	} 

  //shuffle users at end of round or word arrays
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

  //add player to state and emit to others
  //TODO: broadcast current timer if user joins in the middle of one
	playerJoined(player: User) {
		this.players = [...this.players, player];
    io.to(this.room).emit('players_in_room', this.players);
    io.to(this.room).emit('drawer_update', this.drawer);
	}
  
  //remove player from state and decide a new drawer (depending on leaving
  //players position in array), broadcast to room
  playerLeft(id: string) {
    const playerIndex = this.players
      .findIndex(player => Object.keys(player)[0] === id);

    if (this.drawer === this.players[playerIndex]
        && playerIndex < this.players.length - 1) {
      this.drawer = this.players[playerIndex + 1];
    } else {
      this.drawer = this.players[0];
    }

    this.players = this.players.filter(player => Object.keys(player)[0] !== id);
    io.to(this.room).emit('players_in_room', this.players);
  }

  //handle player ready and emit when all users are ready
  playerReady(id: string) {
    const playerIndex = this.players
      .findIndex(player => Object.keys(player)[0] === id);

    this.players[playerIndex][id].ready = !this.players[playerIndex][id].ready;
    
    io.to(this.room).emit('players_in_room', this.players);
    
    if (this.players.findIndex(player => !Object.values(player)[0].ready) === -1) {
      io.to(Object.keys(this.drawer)[0]).emit('can_start', true);
    } else {
      io.to(Object.keys(this.drawer)[0]).emit('can_start', false);
    }
  }

  //select 4 words and send to drawer.  need to add check for adding the same
  //word twice
  sendWordsToDrawer() {
    while (this.wordsToDraw.length < 4) {
      this.wordsToDraw.push(this.words[Math.floor(Math.random() * this.words.length - 1)])
    }

    const drawerId = this.drawer && Object.keys(this.drawer)[0];
    io.to(drawerId).emit('draw_words', this.wordsToDraw);
  }
  
  setSelectedWord(word: string) {
    this.selectedWord = word;
    if (this.drawer) {
      io.to(Object.keys(this.drawer)[0]).emit('selected_word', this.selectedWord);
    }
  }

  //round where drawer picks from a list of words.
  //a word is automatically selected from the 4 if the time runs out
  pickWordRound() {
    clearInterval(this.interval);
    this.interval = null;
    
    this.sendWordsToDrawer();
    
    this.currentChooseDrawWordTimer = this.chooseDrawWordTimer;
    this.interval = setInterval(this.countdown.bind(this, "chooseDrawWord"), 1000);
    this.countdown("chooseDrawWord");
  }

  gameStart() {
    this.players = this.shuffle(this.players);
    this.drawer = this.players[0];
    io.to(this.room).emit('drawer_update', this.drawer);
    
    this.gameIsStarted = true;
    io.to(this.room).emit('game_is_started', this.gameIsStarted);

    this.players.forEach(player => player[Object.keys(player)[0]].ready = false);
    io.to(this.room).emit('players_in_room', this.players);

    this.pickWordRound();
  }

	drawRoundStart() {
    clearInterval(this.interval);
    this.interval = null;
    
    this.currentRoundTimer = this.roundTimer;
    
    this.wordsToDraw = [];
		
    this.roundIsStarted = true;
    io.to(this.room).emit('round_start');

		this.interval = setInterval(this.countdown.bind(this, "round"), 1000);
		this.countdown("round");
    
		io.to(this.room).emit('server_message',
      `Round has started. ${Object.values(this.drawer)[0].name} is drawing`);
	}

	drawRoundEnd() {
    clearInterval(this.interval);
    this.interval = null;
    
    io.to(this.room).emit('clear_canvas');
    io.to(this.room).emit('clear_pos');
		
    this.currentRoundTimer = this.roundTimer;
    this.currentRoundStartTime = this.roundStartTime;
    this.currentChooseDrawWordTimer = this.chooseDrawWordTimer;
    
    this.wordsToDraw = [];

    if (this.playersGuessedCorrect.length > 0) {
      const players = this.playersGuessedCorrect
        .map(player => Object.values(player)[0].name)
        .join(', ');
      
      io.to(this.room).emit('server_message', `The word was ${this.selectedWord}.
        ${players} guessed correctly!`);
    } else {
      io.to(this.room).emit('server_message', `The word was ${this.selectedWord}. 
        No one guessed the word :(`)
    }

    this.playersGuessedCorrect = [];
 
    const playerIndex = this.players
      .findIndex(player => Object.keys(player)[0] === Object.keys(this.drawer)[0]);

    if (this.drawer === this.players[playerIndex]
        && playerIndex < this.players.length - 1) {
      this.drawer = this.players[playerIndex + 1];
    } else {
      this.drawer = this.players[0];
      
      this.currentRound++;
      
      io.to(this.room).emit('round_end', this.currentRound);
    }

    io.to(this.room).emit('drawer_update', this.drawer);
    
    this.setSelectedWord("");

    this.pickWordRound();
	}

  gameEnd() {
    io.to(this.room).emit('game_ended');
  }
}


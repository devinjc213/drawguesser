import { io, User, MessageType } from './index';
import type { Socket } from 'socket.io'
import fs from "fs";

export default class GameController {
  private room: string;
	public players: User[];
	private socket: Socket;
	private maxNumberOfPlayers: number;
	private drawer: User;
  private readonly hintEnabledAfter: number;
  private gameIsStarted: boolean;
	private roundIsStarted: boolean;
	private currentRound: number;
	private readonly roundTimer: number;
	private currentRoundTimer: number;
	private readonly chooseDrawWordTimer: number;
	private currentChooseDrawWordTimer: number;
  private readonly roundStartTime: number;
  private currentRoundStartTime: number;
	private numberOfRounds: number;
	private readonly words: string[];
  private wordsToDraw: string[];
  private usedWordIndexes: number[];
  private selectedWord: string;
  private playersGuessedCorrect: User[];
	private interval: any;
  private hintsGiven: number;
  private readonly maxHintsGiven: number;
  private hintIndexes: number[];

	constructor(
    room: string,
    players: User[],
    socket: Socket,
    roundTimer: number,
    numberOfRounds: number,
    maxNumberOfPlayers: number,
    maxHintsGiven: number,
    hintEnabledAfter: number,
    words: string[]
  ) {
    /*
      Room variables
     */
    this.room = room;
		this.roundTimer = roundTimer;
    this.numberOfRounds = numberOfRounds;
    this.maxNumberOfPlayers = maxNumberOfPlayers
    this.maxHintsGiven = maxHintsGiven;
    this.hintEnabledAfter = hintEnabledAfter;
    this.words = JSON.parse(fs.readFileSync(__dirname + '/1000_words.json', 'utf8')).concat(words);

    console.log(words);
    console.log(this.words);

    /*
      System variables
     */
    this.players = players;
    this.socket = socket;
    this.drawer = players[0];
    this.gameIsStarted = false;
    this.roundIsStarted = false;
    this.currentRound = 1;
    this.hintsGiven = 0;
    this.hintIndexes = [];
    this.currentRoundTimer = this.roundTimer;
    this.chooseDrawWordTimer= 15;
    this.roundStartTime = 5;
    this.currentChooseDrawWordTimer = this.chooseDrawWordTimer;
    this.currentRoundStartTime = this.roundStartTime;
    this.wordsToDraw = [];
    this.usedWordIndexes = [];
    this.selectedWord = "";
    this.playersGuessedCorrect = [];
    this.interval = null;

    io.to(this.room).emit('drawer_update', this.drawer);
	}

  //countdowns for the game round, picking a word to draw, and start countdown 
	countdown(cdType: "round" | "chooseDrawWord" | "3sec") {	
    if (cdType === "round") {
      if (this.currentRoundTimer === this.roundTimer - this.hintEnabledAfter) {
        io.to(this.room).emit('hint_enabled', true);
      }
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

        this.handleScore(socketId, this.currentRoundTimer);
        
        if (this.playersGuessedCorrect.length === this.players.length - 1) {
          io.to(this.room).emit('server_message', 'All users have guessed the word!');
         
          this.drawRoundEnd();
        }
			} else if (!Object.keys(this.playersGuessedCorrect).includes(socketId)) {
				io.to(room).emit("message", { name, msg });
			}	
		}
	}

  getRandomUniqueIndex<T>(arr: T[], usedIndexes: number[]): number {
    const randomIndex = Math.floor(Math.random() * arr.length);

    if (usedIndexes.includes(randomIndex)) {
      return this.getRandomUniqueIndex(arr, usedIndexes);
    } else {
      usedIndexes.push(randomIndex);
      return randomIndex;
    }
  }

  handleHint() {
    if (this.hintsGiven === 0) {
      io.to(this.room).emit('hint_length', this.selectedWord.length);
      this.hintsGiven++;
      io.to(this.room).emit('hint_count', this.hintsGiven);
    } else {
      if (this.hintsGiven < this.maxHintsGiven) {
        const randomIndex = this.getRandomUniqueIndex(this.selectedWord.split(''), this.hintIndexes);
        this.hintIndexes.push(randomIndex);

        io.to(this.room).emit('hint_letter', { index: randomIndex, letter: this.selectedWord[randomIndex] });

        this.hintsGiven++;
        io.to(this.room).emit('hint_count', this.hintsGiven);
      } else {
        io.to(this.room).emit('server_message', 'No more hints left!');
      }
    }
  }

  handleScore(socketId: string, currentTime: number) {
    const playerIndex = this.players
      .findIndex(player => Object.keys(player)[0] === socketId);

    const drawerIndex = this.players
      .findIndex(player => Object.keys(player)[0] === Object.keys(this.drawer)[0]);

    this.playersGuessedCorrect.push(this.players[playerIndex]);

    const basePoints = this.players.length * 10;
    const guessOrderPenalty = this.playersGuessedCorrect.length * 10;
    const timeBonus = Math.ceil(currentTime / 2);
    const score = basePoints - guessOrderPenalty + timeBonus;
    
    Object.values(this.players[playerIndex])[0].score += score;

    Object.values(this.players[drawerIndex])[0].score += 10;

    io.to(this.room).emit('players_in_room', this.players);
  }

  //shuffle users for a new game whatever other arrays
	shuffle<T>(array: T[]): T[] {
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

    if (this.drawer === this.players[playerIndex]) {
      if (playerIndex < this.players.length - 1) {
        this.drawer = this.players[playerIndex + 1];
      } else {
        this.drawer = this.players[0];
      }

      this.drawRoundEnd(true);
    }

    this.players = this.players.filter(player => Object.keys(player)[0] !== id);

    if (this.players.length === 0) {
      this.gameEnd();
    } else {
      io.to(this.room).emit('players_in_room', this.players);
    }
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
      const randomIndex = this.getRandomUniqueIndex(this.words, this.usedWordIndexes);
      this.wordsToDraw.push(this.words[randomIndex]);
      this.usedWordIndexes.push(randomIndex);
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

	drawRoundEnd(drawerLeft: boolean = false) {
    clearInterval(this.interval);
    this.interval = null;
    this.hintsGiven = 0;
    this.hintIndexes = [];

    io.to(this.room).emit('clear_canvas');
    io.to(this.room).emit('clear_pos');
    io.to(this.room).emit('hint_enabled', false);

    this.currentRoundTimer = this.roundTimer;
    this.currentRoundStartTime = this.roundStartTime;
    this.currentChooseDrawWordTimer = this.chooseDrawWordTimer;

    this.wordsToDraw = [];

    if (drawerLeft) {
      io.to(this.room).emit('server_message', 'The drawer left!  Round ended.');
    }

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

    if (!drawerLeft) {
      const playerIndex = this.players
        .findIndex(player => Object.keys(player)[0] === Object.keys(this.drawer)[0]);

      if (this.drawer === this.players[playerIndex]
        && playerIndex < this.players.length - 1) {
        this.drawer = this.players[playerIndex + 1];
      } else {
        this.drawer = this.players[0];
      }
    }

    this.currentRound++;

    io.to(this.room).emit('round_end', this.currentRound);

    io.to(this.room).emit('drawer_update', this.drawer);

    this.setSelectedWord("");

    this.pickWordRound();
	}

  gameEnd() {
    io.to(this.room).emit('game_ended');
    this.interval = null;
    this.currentRoundTimer = this.roundTimer;
  }
}


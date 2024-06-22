import { io, User, MessageType } from '../index';
import type { Socket } from 'socket.io'
import fs from "fs";
import RoomController from "./room.controller";
import {getRandomUniqueIndex, shuffle} from "../utils";

export default class GameController {
  private room: RoomController;
  public gameIsStarted: boolean;
	public roundIsStarted: boolean;
	public currentRound: number;
	public currentRoundTimer: number;
	private readonly chooseDrawWordTimer: number;
	private currentChooseDrawWordTimer: number;
  private readonly roundStartTime: number;
  private currentRoundStartTime: number;
	private readonly words: string[];
  public wordsToDraw: string[];
  private usedWordIndexes: number[];
  public selectedWord: string;
  private playersGuessedCorrect: User[];
	private interval: any;
  private hintsGiven: number;
  private hintIndexes: number[];

	constructor(
    room: RoomController,
    extraWords: string[]
  ) {
    this.room = room;
    this.words = JSON.parse(fs.readFileSync('./1000_words.json', 'utf8')).concat(extraWords);
    this.gameIsStarted = false;
    this.roundIsStarted = false;
    this.currentRound = 1;
    this.hintsGiven = 0;
    this.hintIndexes = [];
    this.currentRoundTimer = this.room.roundTimer;
    this.chooseDrawWordTimer= 15;
    this.roundStartTime = 5;
    this.currentChooseDrawWordTimer = this.chooseDrawWordTimer;
    this.currentRoundStartTime = this.roundStartTime;
    this.wordsToDraw = [];
    this.usedWordIndexes = [];
    this.selectedWord = "";
    this.playersGuessedCorrect = [];
    this.interval = null;
	}

	countdown(cdType: "round" | "chooseDrawWord" | "3sec") {
    if (cdType === "round") {
      if (this.currentRoundTimer === this.room.roundTimer - this.room.hintsEnabledAfter) {
        io.to(this.room.id).emit('hint_enabled', true);
      }

      if (this. currentRoundTimer < 11 && this.currentRoundTimer > 0) {
        io.to(this.room.id).emit('play_tick', true);
      }

      if (this.currentRoundTimer > 0) this.currentRoundTimer -= 1;
      else {
        clearInterval(this.interval);
        this.interval = null;
        this.drawRoundEnd();
      }

      io.to(this.room.id).emit('round_timer', this.currentRoundTimer);

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

      io.to(this.room.id).emit('intermission_timer', this.currentChooseDrawWordTimer);
    } else if (cdType === "3sec") {
      if (this.currentRoundStartTime > 0) this.currentRoundStartTime -= 1;
      else {
        clearInterval(this.interval);
        this.interval = null;
        this.drawRoundStart();
      }

      io.to(this.room.id).emit('intermission_timer', this.currentRoundStartTime);
    }
	}

  handleHint() {
    if (this.hintsGiven === 0) {
      io.to(this.room.id).emit('hint_length', this.selectedWord.length);
      this.hintsGiven++;
      io.to(this.room.id).emit('hint_count', this.hintsGiven);
    } else {
      if (this.hintsGiven < this.room.maxHints) {
        const randomIndex = getRandomUniqueIndex(this.selectedWord.split(''), this.hintIndexes);
        this.hintIndexes.push(randomIndex);

        io.to(this.room.id).emit('hint_letter', { index: randomIndex, letter: this.selectedWord[randomIndex] });

        this.hintsGiven++;
        io.to(this.room.id).emit('hint_count', this.hintsGiven);
      } else {
        io.to(this.room.id).emit('server_message', 'No more hints left!');
      }
    }
  }

  handleScore(socketId: string, currentTime: number) {
    const playerIndex = this.room.players
      .findIndex(player => player.socketId === socketId);

    const drawerIndex = this.room.players
      .findIndex(player => player.socketId === this.room.drawer.socketId);

    this.playersGuessedCorrect.push(this.room.players[playerIndex]);

    const basePoints = this.room.players.length * 10;
    const guessOrderPenalty = this.playersGuessedCorrect.length * 10;
    const timeBonus = Math.ceil(currentTime / 2);
    const score = basePoints - guessOrderPenalty + timeBonus;
    
    this.room.players[playerIndex].score += score;

    this.room.players[drawerIndex].score += 6;

    io.to(this.room.id).emit('players_in_room', this.room.players);
  }

  sendWordsToDrawer() {
    while (this.wordsToDraw.length < 4) {
      const randomIndex = getRandomUniqueIndex(this.words, this.usedWordIndexes);
      this.wordsToDraw.push(this.words[randomIndex]);
      this.usedWordIndexes.push(randomIndex);
    }

    io.to(this.room.drawer.socketId).emit('draw_words', this.wordsToDraw);
  }
  
  setSelectedWord(word: string) {
    this.selectedWord = word;

    io.to(this.room.drawer.socketId).emit('selected_word', this.selectedWord);

    this.wordsToDraw = [];
    io.to(this.room.id).emit('draw_words', this.wordsToDraw);
  }

  pickWordRound() {
    clearInterval(this.interval);
    this.interval = null;
    
    this.sendWordsToDrawer();
    
    this.currentChooseDrawWordTimer = this.chooseDrawWordTimer;
    this.interval = setInterval(this.countdown.bind(this, "chooseDrawWord"), 1000);
    this.countdown("chooseDrawWord");
  }

  gameStart() {
    this.room.players = shuffle(this.room.players);
    this.room.drawer = this.room.players[0];
    io.to(this.room.id).emit('drawer_update', this.room.drawer);
    
    this.gameIsStarted = true;
    io.to(this.room.id).emit('game_is_started', this.gameIsStarted);

    this.room.players.forEach(player => player.ready = false);
    io.to(this.room.id).emit('players_in_room', this.room.players);

    this.pickWordRound();
  }

	drawRoundStart() {
    clearInterval(this.interval);
    this.interval = null;

    this.currentRoundTimer = this.room.roundTimer;

    this.wordsToDraw = [];

    this.roundIsStarted = true;
    io.to(this.room.id).emit('round_start');

		this.interval = setInterval(this.countdown.bind(this, "round"), 1000);
		this.countdown("round");
    
		io.to(this.room.id).emit('server_message',
      `Round has started. ${this.room.drawer.name} is drawing`);
	}

	drawRoundEnd(drawerLeft: boolean = false) {
    clearInterval(this.interval);
    this.interval = null;
    this.hintsGiven = 0;
    this.hintIndexes = [];

    this.currentRoundTimer = this.room.roundTimer;
    this.currentRoundStartTime = this.roundStartTime;
    this.currentChooseDrawWordTimer = this.chooseDrawWordTimer;

    io.to(this.room.id).emit('clear_canvas');
    io.to(this.room.id).emit('clear_pos');
    io.to(this.room.id).emit('hint_enabled', false);

    if (drawerLeft) {
      io.to(this.room.id).emit('server_message', 'The drawer left!  Round ended.');
    }

    if (this.playersGuessedCorrect.length > 0) {
      const players = this.playersGuessedCorrect
        .map(player => player.name)
        .join(', ');

      io.to(this.room.id).emit('server_message', `The word was ${this.selectedWord}.
        ${players} guessed correctly!`);
    } else {
      io.to(this.room.id).emit('server_message', `The word was ${this.selectedWord}. 
        No one guessed the word :(`)
    }

    this.playersGuessedCorrect = [];

    if (!drawerLeft) {
      const drawerIndex = this.room.players
        .findIndex(player => player.socketId === this.room.drawer.socketId);

      if (drawerIndex < this.room.players.length - 1) {
        this.room.drawer = this.room.players[drawerIndex + 1];
      } else {
        this.room.drawer = this.room.players[0];
        this.currentRound++;

        if (this.currentRound > this.room.numberOfRounds) {
          this.gameEnd();
          return;
        }
      }
    }

    io.to(this.room.id).emit('round_end', this.currentRound);

    io.to(this.room.id).emit('drawer_update', this.room.drawer);

    this.setSelectedWord("");

    this.pickWordRound();
	}

  gameEnd() {
    clearInterval(this.interval);
    this.interval = null;

    this.room.players = this.room.players
      .sort((a, b) => b.score - a.score);

    io.to(this.room.id).emit('game_over');
    io.to(this.room.id).emit('final_scores', this.room.players);
    io.to(this.room.id).emit('clear_canvas');
    io.to(this.room.id).emit('clear_pos');
    io.to(this.room.id).emit('hint_enabled', false);
    io.to(this.room.id).emit('can_start', false);
    io.to(this.room.id).emit('game_is_started', false);

    this.gameIsStarted = false;
    this.roundIsStarted = false;
    this.currentRound = 1;
    this.hintsGiven = 0;
    this.hintIndexes = [];
    this.wordsToDraw = [];
    this.usedWordIndexes = [];
    this.selectedWord = "";
    this.playersGuessedCorrect = [];
    this.currentRoundTimer = this.room.roundTimer;
  }

  playAgain() {
    io.to(this.room.id).emit('play_again_start');
  }
}


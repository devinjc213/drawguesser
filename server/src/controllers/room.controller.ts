import { io, User, MessageType } from "../index";
import GameController from "./game.controller";

export default class RoomController {
  public game: GameController;
  public id: string;
  public name: string;
  public players: User[];
  public drawer: User;
  public maxPlayers: number;
  public playersGuessedCorrect: User[];
  public roundStarted: boolean;
  public roundTimer: number;
  public numberOfRounds: number;
  public maxHints: number;
  public hintsEnabledAfter: number;
  public chatHistory: Partial<MessageType>[];

  constructor(
    id: string,
    name: string,
    players: User[],
    maxPlayers: number,
    numberOfRounds: number,
    roundTimer: number,
    maxHints: number,
    hintsEnabledAfter: number,
    extraWords: string[]
  ) {
    this.game = new GameController(this, extraWords ?? []);
    this.id = id;
    this.name = name;
    this.players = players;
    this.maxPlayers = maxPlayers;
    this.playersGuessedCorrect = [];
    this.numberOfRounds = numberOfRounds;
    this.roundTimer = roundTimer;
    this.maxHints = maxHints;
    this.hintsEnabledAfter = hintsEnabledAfter;
    this.roundStarted = false;
    this.drawer = this.players[0];
    this.chatHistory = [];

    io.to(this.id).emit('drawer_update', this.drawer);
  }

  playerJoined(player: User) {
    this.players = [...this.players, player];
    io.to(this.id).emit('players_in_room', this.players);
    io.to(this.id).emit('drawer_update', this.drawer);
    io.to(player.socketId).emit('chat_history', this.chatHistory);
  }

  playerLeft(id: string) {
    const playerIndex = this.players
      .findIndex(player => player.socketId === id);

    if (this.drawer === this.players[playerIndex]) {
      if (playerIndex < this.players.length - 1) {
        this.drawer = this.players[playerIndex + 1];
      } else {
        this.drawer = this.players[0];
      }

      this.game.drawRoundEnd(true);
    }

    this.players = this.players.filter(player => player.socketId !== id);

    if (this.players.length === 0) {
      this.game.gameEnd();
    } else {
      io.to(this.id).emit('players_in_room', this.players);
    }
  }

  playerReady(id: string) {
    const playerIndex = this.players
      .findIndex(player => player.socketId === id);

    this.players[playerIndex].ready = !this.players[playerIndex].ready;

    io.to(this.id).emit('players_in_room', this.players);

    console.log('player ready');

    if (this.players.findIndex(player => !player.ready) === -1) {
      io.to(this.id).emit('can_start', true);
      console.log('can start');
    } else {
      io.to(this.id).emit('can_start', false);
      console.log('cant start');
    }
  }

  handleMessage({ socketId, name, msg, room }: MessageType) {
    if (this.game.roundIsStarted && socketId === this.drawer.socketId) return;

    if (!this.game.roundIsStarted) {
      io.to(room).emit("message", { name, msg });
      this.chatHistory.push({ name, msg });
    } else {
      if (msg === this.game.selectedWord) {
        io.to(this.id).emit('server_message', `${name} guessed the word!`);
        io.to(this.id).emit('player_guessed_word', true);

        this.game.handleScore(socketId, this.game.currentRoundTimer);

        const player = this.players.find(player => player.socketId === socketId);
        if (player) this.playersGuessedCorrect.push(player)

        if (this.playersGuessedCorrect.length === this.players.length - 1) {
          io.to(this.id).emit('server_message', 'All users have guessed the word!');

          this.game.drawRoundEnd();
        }
      } else if (
        this.playersGuessedCorrect
          .findIndex(player => player.socketId === socketId) === -1
      ) {
        io.to(room).emit("message", { name, msg });
        this.chatHistory.push({ name, msg });
      }
    }
  }
}

import { createStore } from 'solid-js/store';
import {Game} from "../types/game.type";
import {User} from "../types/user.type";

export const [game, setGame] = createStore<Game>({
  socket: null,
  roomName: "lobby",
  drawer: {
    name: "",
    socketId: "",
    score: 0,
  },
  selectedWord: "",
  currentWord: "",
  gameStarted: false,
  roundStarted: false,
  currentRoundTimer: 0,
  currentRound: 0,
  currentIntermissionTimer: 0,
  isGameOver: true,
  muted: false,
});

if (game.socket) {
  game.socket.on('play_again_start', () => setGame('isGameOver', false));

  game.socket.on('create_join_room', (roomName: string) => setGame('roomName', roomName));

  game.socket.on('drawer_update', (drawer: User) => setGame('drawer', drawer));

  game.socket.on ('selected_word', (word: string) => setGame('selectedWord', word));

  game.socket.on('round_start', () => setGame('roundStarted', true));

  game.socket.on('round_timer', (timer: number) => setGame('currentRoundTimer', timer));

  game.socket.on('intermission_timer', (timer: number) => {
    setGame('currentIntermissionTimer', timer);
  });

  game.socket.on('round_end', (curRound: number) => {
    setGame('roundStarted', false);
    setGame('currentRound', curRound);
    setGame('selectedWord', '');
  });

  game.socket.on('game_is_started', (isStarted: boolean) => setGame('gameStarted', isStarted));

  game.socket.on('game_over', () => {
    setGame('isGameOver', true);
    setGame('currentIntermissionTimer', 0);
    setGame('currentRoundTimer', 0);
    setGame('currentRound', 1);
    setGame('selectedWord', '');
    setGame('roundStarted', false);
    setGame('gameStarted', false);
  });
}

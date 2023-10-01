import { createStore } from 'solid-js/store';
import {Game} from "../types/game.type";
import {room, setRoom} from "./room.store";
import {createEffect} from "solid-js";

export const [game, setGame] = createStore<Game>({
  socket: null,
  selectedWord: "",
  gameStarted: false,
  isGameOver: false,
  drawWords: [],
  muted: false,
  currentRound: 1,
  currentRoundTimer: 0,
  currentIntermissionTimer: 0,
  extraWords: [],
});

createEffect(() => {
  if (game.socket) {
    game.socket.on('round_timer', (timer: number) => setGame('currentRoundTimer', timer));

    game.socket.on('play_again_start', () => setGame('isGameOver', false));

    game.socket.on ('selected_word', (word: string) => setGame('selectedWord', word));

    game.socket.on('round_end', () => setGame('drawWords', []));

    game.socket.on('game_over', () => setGame('drawWords', []));

    game.socket.on('draw_words', words => setGame('drawWords', words));

    game.socket.on('game_is_started', (isStarted: boolean) => setGame('gameStarted', isStarted));

    game.socket.on('intermission_timer', (timer: number) => {
      setGame('currentIntermissionTimer', timer);
    });

    game.socket.on('game_over', () => {
      setGame('isGameOver', true);
      setGame('currentIntermissionTimer', 0);
      setGame('currentRoundTimer', 0);
      setGame('currentRound', 1);
      setGame('selectedWord', '');
      setRoom('roundStarted', false);
      setGame('gameStarted', false);
    });
  }
});

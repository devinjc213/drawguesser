import {createSignal, Show, onCleanup, onMount} from 'solid-js';
import type { Component } from 'solid-js';
import { useParams } from '@solidjs/router';
import { io } from "socket.io-client";
import { game, setGame } from './stores/game.store';
import { user } from './stores/user.store';
import { room, setRoom } from './stores/room.store';
import NameModal from './components/NameModal';
import RoomBrowser from './components/RoomBrowser';
import Canvas from './components/Canvas';
import Chat from './components/Chat';
import GameControls from './components/GameControls';
import PlayerList from './components/PlayerList';
import styles from './App.module.css';
import tick from './assets/sounds/tick.flac';
import correctGuess from './assets/sounds/correctGuess.mp3';
import winner from './assets/sounds/winner.wav';

const socket = io(
  import.meta.env.DEV
    ? import.meta.env.VITE_DEV_IO_URL
    : import.meta.env.VITE_PROD_IO_URL,
  {
    withCredentials: true,
    path: "/socket.io/"
  }
);

const App: Component = () => {
  const [muted, setMuted] = createSignal<boolean>(false);

  const sound_tick = new Audio(tick);
  const sound_guess = new Audio(correctGuess);
  const sound_game_over = new Audio(winner);

  onMount(() => {
    setGame('socket', socket);
    setRoom('socket', socket);
    const params = useParams();

    if (params.room) {
      socket.emit('join_room', { name: user.name, roomId: params.room } );
    }
  });

  onCleanup(() => socket.disconnect());

  socket.on('game_over', () => {
    if (!muted()) {
      sound_game_over.play();
    }
  });

  socket.on('play_tick', () => {
    if (!muted()) sound_tick.play()
  });

  socket.on('player_guessed_word', () => {
    if (!muted()) {
      sound_guess.play();
    }
  });

  return (
    <div class={styles.App}>
			<Show when={(room.name === "lobby" && user.name)} keyed>
				<RoomBrowser socket={socket} />
			</Show>
			<Show when={room.name !== "lobby"} keyed>
				<div class={styles.gameContainer}>
          <div class={styles.topBar}>
            <div>
              {`${room.name} - Round ${game.currentRound}`}
            </div>
            <div>{room.roundStarted ? game.currentRoundTimer : game.currentIntermissionTimer}</div>
          </div>
          <div class={styles.gameBody}> 
            <div class={styles.leftColumn}>
              <PlayerList socket={socket} />
              <GameControls
                socket={socket}
                setMute={setMuted}
                muted={muted()}
              />
            </div>
            <Chat socket={socket} />
            <Canvas socket={socket} />
          </div>
				</div>
			</Show>	
			<Show when={!user.name} keyed>
				<NameModal />
			</Show>
    </div>
  );
};

export default App;

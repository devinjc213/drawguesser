import { createSignal, Show, onCleanup } from 'solid-js';
import type { Component } from 'solid-js';
import { io } from "socket.io-client";
import NameModal from './components/NameModal';
import RoomBrowser from './components/RoomBrowser';
import Canvas from './components/Canvas';
import Chat from './components/Chat';
import GameControls from './components/GameControls';
import PlayerList from './components/PlayerList';
import { Icons } from './assets/Icons';

import styles from './App.module.css';

const socket = io("http://localhost:4000"); 

export type User = {
  [key: string]: {
    name: string
    score?: number
    ready?: boolean
  }
}

//need to clear all data on leave room button
const App: Component = () => {
	const [room, setRoom] = createSignal<string>("lobby");
	const [name, setName] = createSignal<string>("");
	const [drawer, setDrawer] = createSignal<User>({});
  const [selectedWord, setSelectedWord] = createSignal<string>("");
  const [currentRound, setCurrentRound] = createSignal<number>(1);
  const [gameStarted, setGameStarted] = createSignal<boolean>(false);
	const [roundStarted, setRoundStarted] = createSignal<boolean>(false);
	const [currentRoundTime, setCurrentRoundTime] = createSignal<number>(45);
  const [currentIntermissionTimer, setCurrentIntermissionTimer] =
    createSignal<number>();
  const [initialRooms, setInitialRooms] = createSignal<string[]>([]);

  onCleanup(() => socket.disconnect());
		
	socket.on('create_join_room', room => setRoom(room));
 
	socket.on('round_start', () => setRoundStarted(true));
	 
	socket.on('round_timer', (timer: number) => setCurrentRoundTime(timer));

  socket.on('intermission_timer', (timer: number) => {
    setCurrentIntermissionTimer(timer);
  });

  socket.on('round_end', (curRound) => {
    setRoundStarted(false);
    setCurrentRound(curRound);
    setSelectedWord("");
  });

  socket.on('initial_rooms', (rounds) => setInitialRooms(rounds));

  socket.on('drawer_update', user => setDrawer(user));

  socket.on('selected_word', word => setSelectedWord(word));

  socket.on('game_is_started', (gameIsStarted) => {
      setGameStarted(gameIsStarted);
  });

  return (
    <div class={styles.App}>
			<Show when={(room() === "lobby" && name())} keyed>
				<RoomBrowser getRoom={setRoom} socket={socket} name={name()} initialRooms={initialRooms()}/>
			</Show>
			<Show when={room() !== "lobby"} keyed>
				<div class={styles.gameContainer}>
          <div class={styles.topBar}>
            <div>
              {`${room()} - Round ${currentRound()}`}
            </div>
            <div>{roundStarted() ? currentRoundTime() : currentIntermissionTimer()}</div>
          </div>
          <div class={styles.gameBody}> 
            <div class={styles.leftColumn}>
              <PlayerList socket={socket} drawer={drawer()} />
              <GameControls
                socket={socket}
                room={room()}
                drawer={drawer()}
                name={name()}
                roundStarted={roundStarted()}
                setRoom={setRoom}
                gameStarted={gameStarted()}
              />
            </div>
            <Chat
              socket={socket}
              drawer={drawer()}
              name={name()}
              room={room()}
              roundStarted={roundStarted()}
            />
            <Canvas
              socket={socket}
              room={room()}
              isDrawer={socket.id === Object.keys(drawer())[0]}
              isRoundStarted={roundStarted()}
              selectedWord={selectedWord()}
            />
          </div>
				</div>
			</Show>	
			<Show when={!name()} keyed>
				<NameModal getName={setName} />
			</Show>
    </div>
  );
};

export default App;

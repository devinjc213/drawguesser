import { createSignal, createEffect, onMount, onCleanup, For, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { io } from "socket.io-client";
import NameModal from './components/NameModal';
import RoomBrowser from './components/RoomBrowser';
import Canvas from './components/Canvas';
import { Icons } from './assets/Icons';

import styles from './App.module.css';

const socket = io("http://localhost:4000"); 

type User = {
  [key: string]: {
    name: string
    score?: number
    ready?: boolean
  }
}

type MessageType = {
	name: string
	msg: string
  serverMsg?: boolean
}

const App: Component = () => {
	const [room, setRoom] = createSignal<string>("lobby");
	const [name, setName] = createSignal<string>("");
	const [chat, setChat] = createSignal<MessageType[]>([]);
	const [drawer, setDrawer] = createSignal<User>({});
  const [currentRound, setCurrentRound] = createSignal<number>(1);
	const [roundStarted, setRoundStarted] = createSignal<boolean>(false);
	const [currentRoundTime, setCurrentRoundTime] = createSignal<number>(45);
  const [playersInRoom, setPlayersInRoom] = createSignal<User[]>([]);
  const [currentIntermissionTimer, setCurrentIntermissionTimer] =
    createSignal<number>();
	const [message, setMessage] = createSignal<string>("");
  const [initialRooms, setInitialRooms] = createSignal<string[]>();
  const [mute, setMute] = createSignal<boolean>(false);
  const [ready, setReady] = createSignal<boolean>(false);
  const [canStart, setCanStart] = createSignal<boolean>(false);
		
	onMount(() => {
		document.addEventListener("keypress", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				handleSendMessage();
			}
		});
	});

	onCleanup(() => {
		document.removeEventListener("keypress", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				handleSendMessage();
			}
		});

		socket.disconnect();
	});

	const handleSendMessage = () => {
		if (!message() || (Object.values(drawer())[0].name === name() && roundStarted())) return;

		socket.emit('message', { socketId: socket.id, name: name(), msg: message(), room: room() });
		setMessage("");
	}

  const handleReady = () => {
    setReady(ready => !ready);
    socket.emit('player_ready', { room: room() });
  }

	const handleStart = () => {
		socket.emit('start_game', { room: room() });
	}

  const handleLeaveRoom = () => {
    socket.emit('leave_room', { room: room(), name: name(), socketId: socket.id });
    setRoom("lobby");
  }

	socket.on('message', data => {
		if (data) setChat(chat => [...chat, { name: data.name, msg: data.msg }]);
	});

  socket.on('server_message', msg => {
    setChat(chat => [...chat, { name: 'SERVER', msg: msg, serverMsg: true }]);
  });

	socket.on('create_join_room', room => {
		setRoom(room);
	});
 
	socket.on('round_start', data => {
		setChat(chat => [...chat, { name: 'SERVER', msg: data.msg, serverMsg: true }]);
		setDrawer(data.drawer);
		setRoundStarted(true);
	});
	
	socket.on('round_timer', (timer: number) => {
		setCurrentRoundTime(timer);
	});

  socket.on('intermission_timer', (timer: number) => {
    setCurrentIntermissionTimer(timer);
  });

  socket.on('players_in_room', (players) => {
    setPlayersInRoom(players);
  });

  socket.on('round_end', (curRound) => {
    setRoundStarted(false);
    setCurrentRound(curRound);
  });
  socket.on('initial_rooms', (rounds) => {
    setInitialRooms(rounds);
  });

  socket.on('room_init', user => {
      console.log(user);
      setPlayersInRoom(user);
      setDrawer(user);
      console.log(playersInRoom());
      console.log(drawer());
  });

  socket.on('can_start', canStart => setCanStart(canStart));

  return (
    <div class={styles.App}>
			<Show when={(room() === "lobby" && name())}>
				<RoomBrowser getRoom={setRoom} socket={socket} name={name()} initialRooms={initialRooms()}/>
			</Show>
			<Show when={room() !== "lobby"}> 
				<div class={styles.gameContainer}>
          <div class={styles.topBar}>
            <div>
              {`${room()} - Round ${currentRound()}`}
            </div>
            <div>{roundStarted() ? currentRoundTime() : currentIntermissionTimer()}</div>
            <div>
              Hint
            </div>
          </div>
          <div class={styles.gameBody}>
            <div class={styles.leftColumn}>
              <div class={styles.playersWrapper}>
                <div class={styles.playersInRoom}>
                  <For each={playersInRoom()}>
                    {(player: User) => (
                      <div class={styles.playerNameWrapper}>
                        <span class={Object.values(player)[0].ready ? styles.greenText: ''}>
                          {Object.values(player)[0].name}
                        </span>
                        <span>
                          <Show
                            when={Object.values(player)[0].ready}
                            fallback={Object.values(player)[0].score ?? 0}
                          >
                            <img src={Icons.GreenCheck} width="10" height="10" alt="checkmark" />
                          </Show>
                        </span>
                      </div>
                    )}
                  </For>  
                </div>
              </div>
              <div class={styles.gameControlWrapper}>
                <div
                  class={ready() ?
                    `${styles.divBtn} ${styles.unreadyBtn}`
                    : `${styles.divBtn} ${styles.readyBtn}`}
                  onClick={() => handleReady()}
                >
                  {ready() ? 'Unready' : 'Ready'}
                </div>
                <Show
                  when={name() && !roundStarted() && Object.keys(drawer())[0] === socket.id}
                >
                  <div
                    class={canStart()
                      ? `${styles.divBtn} ${styles.readyBtn}`
                      : `${styles.divBtn} ${styles.disabledBtn}`}
                    onClick={() => {
                      if (canStart()) handleStart();
                    }}
                  >
                    Start
                  </div>
                </Show>
                <div class={styles.soundWrapper}>
                  <img
                    src={Icons.Sound}
                    alt="mute"
                    height="36"
                    width="36"
                    onClick={() => setMute(true)}
                  />
                  <Show when={mute()}>
                    <img
                      src={Icons.NoSign}
                      class={styles.noSign}
                      height="48"
                      width="48"
                      alt="unmute"
                      onClick={() => setMute(false)}
                    />
                  </Show>
                </div>
                <img src={Icons.LeaveRoom} alt="Leave room" onClick={() => handleLeaveRoom()} /> 
              </div>
            </div>
            <div class={styles.chatWrapper}>
              <div class={styles.chat}>
                <For each={chat()}>
                  {(msg: MessageType) => {
                    if (msg.serverMsg) {
                      return <div><b>{msg.msg}</b></div>;
                    } else {
                      return (
                        <div class={styles.chatMsg}>
                          <span>{msg.name}:</span>{msg.msg}
                        </div>
                      )
                    } 
                  }}
                </For>
              </div>  
              <div class={styles.sendMsgWrapper}>
                <input
                  class={styles.textInput}
                  onInput={(e) => setMessage(e.currentTarget.value)}
                  value={message()} 
                />
                <button class={styles.sendBtn} onClick={handleSendMessage}>Send</button>
              </div>
            </div>
            <Canvas socket={socket} isDrawer={socket.id === Object.keys(drawer())[0]} />
          </div>
				</div>
			</Show>	
			<Show when={!name()}>
				<NameModal getName={setName} />
			</Show>
    </div>
  );
};

export default App;

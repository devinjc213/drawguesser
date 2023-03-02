import { createSignal, createEffect, onMount, onCleanup, For, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { io } from "socket.io-client";
import NameModal from './components/NameModal';
import RoomBrowser from './components/RoomBrowser';
import Canvas from './components/Canvas';

import styles from './App.module.css';

const socket = io("http://localhost:4000"); 

type UserAndSocket = { [key: string]: string }
type MessageType = {
	name: string
	msg: string
  serverMsg?: boolean
}

const App: Component = () => {
	const [room, setRoom] = createSignal<string>("");
	const [name, setName] = createSignal<string>("");
	const [chat, setChat] = createSignal<MessageType[]>([]);
	const [drawer, setDrawer] = createSignal<string>("");
  const [currentRound, setCurrentRound] = createSignal<number>(1);
	const [roundStarted, setRoundStarted] = createSignal<boolean>(false);
	const [currentRoundTime, setCurrentRoundTime] = createSignal<number>(45);
  const [playersInRoom, setPlayersInRoom] = createSignal<UserAndSocket[]>([]);
  const [currentIntermissionTimer, setCurrentIntermissionTimer] =
    createSignal<number>();
	const [message, setMessage] = createSignal<string>("");

		
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
		if (!message() || (drawer() === name() && roundStarted())) return;

		socket.emit('message', { name: name(), msg: message(), room: room() });
		setMessage("");
	}

	const handleStart = () => {
		socket.emit('start_game', { room: room() });
	}

	socket.on('message', data => {
		if (data) setChat(chat => [...chat, { name: data.name, msg: data.msg }]);
	});

  socket.on('server_message', msg => {
      setChat(chat => [...chat, { name: 'SERVER', msg: msg, serverMsg: true }]);
  });

	socket.on('create_join_room', room => {
		setRoom(room);
    setPlayersInRoom([{ [socket.id]: name() }])
	})
	socket.on('round_start', data => {
		setChat(chat => [...chat, { name: 'SERVER', msg: data.msg, serverMsg: true }]);
		setDrawer(data.drawer);
		setRoundStarted(true);
	})
	
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

  return (
    <div class={styles.App}>
			<Show when={!room()}>
				<RoomBrowser getRoom={setRoom} socket={socket} name={name()} />
			</Show>
			<Show when={room()}> 
				<div class={styles.gameContainer}>
          <div class={styles.playersInRoom}>
            {playersInRoom().map(player => (
              <div>
                {Object.values(player)}
              </div>
             ))}
          </div>
					<div class={styles.chat}>
            {room()}{currentRoundTime()}{currentIntermissionTimer()}
						<div class={styles.chatBox}>
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
						<input class={styles.textInput} onInput={(e) => setMessage(e.currentTarget.value)} value={message()} />
						<button onClick={handleSendMessage}>send</button>
					</div>
					<Canvas socket={socket} isDrawer={socket.id === Object.keys(drawer())[0]} />
					<button onClick={() => handleStart()}>start</button>
				</div>
			</Show>	
			<Show when={!name()}>
				<NameModal getName={setName} />
			</Show>
    </div>
  );
};

export default App;

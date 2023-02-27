import { createSignal, createEffect, onMount, onCleanup, For, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { io } from "socket.io-client";
import NameModal from './components/NameModal';
import RoomBrowser from './components/RoomBrowser';
import Canvas from './components/Canvas';

import styles from './App.module.css';

const socket = io("http://localhost:4000"); 

type MessageType = {
	name: string
	msg: string
}

const App: Component = () => {
	const [room, setRoom] = createSignal<string>("");
	const [name, setName] = createSignal<string>("");
	const [chat, setChat] = createSignal<MessageType[]>([]);
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
		if (!message()) return;

		socket.emit('message', { name: name(), msg: message(), room: room() });
		setMessage("");
	}

	socket.on('message', data => {
		if (data) setChat(chat => [...chat, { name: data.name, msg: data.msg }]);
	});

	socket.on('create_join_room', room => {
		setRoom(room);
	})

  return (
    <div class={styles.App}>
			<Show when={!room()}>
				<RoomBrowser getRoom={setRoom} socket={socket} />
			</Show>
			<Show when={room()}> 
				<div class={styles.gameContainer}>
					<div class={styles.chat}>
						<div class={styles.chatBox}>
							<For each={chat()}>{(msg: MessageType) => <div class={styles.chatMsg}><span>{msg.name}:</span>{msg.msg}</div>}</For>
						</div>
						<input class={styles.textInput} onInput={(e) => setMessage(e.currentTarget.value)} value={message()} />
						<button onClick={handleSendMessage}>send</button>
					</div>
					<Canvas socket={socket} />
				</div>
			</Show>	
			<Show when={!name()}>
				<NameModal getName={setName} />
			</Show>
    </div>
  );
};

export default App;

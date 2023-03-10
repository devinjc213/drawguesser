import type { Component } from 'solid-js';
import type { Socket } from 'socket.io-client';
import type { User } from '../App';
import { For, createSignal, createEffect, onMount, onCleanup } from 'solid-js';
import styles from './Chat.module.css';

type MessageType = {
	name: string
	msg: string
  serverMsg?: boolean
}

const Chat: Component<{
  socket: Socket,
  drawer: User,
  name: string,
  room: string,
  roundStarted: boolean
}> = (props) => {
  const [chat, setChat] = createSignal<MessageType[]>([]);
  const [message, setMessage] = createSignal<string>("");
  let chatRef: any;

  onMount(() => {
		document.addEventListener("keypress", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				handleSendMessage();
			}
		});

    document.addEventListener("DOMNodeInserted", (e) => {
      chatRef.scroll({ top: chatRef.scrollHeight, behavior: "smooth" });
    });
	});

	onCleanup(() => {
		document.removeEventListener("keypress", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				handleSendMessage();
			}
		});

		props.socket.disconnect();
	});

	const handleSendMessage = () => {
		if (!message()
        || (Object.values(props.drawer)[0].name === props.name) && props.roundStarted) return;

		props.socket.emit('message', {
      socketId: props.socket.id,
      name: props.name,
      msg: message(),
      room: props.room
    });

		setMessage("");
	}

	props.socket.on('message', data => {
		if (data) setChat(chat => [...chat, { name: data.name, msg: data.msg }]);
	});

  props.socket.on('server_message', msg => {
    setChat(chat => [...chat, { name: 'SERVER', msg: msg, serverMsg: true }]);
  });

  return (
    <div class={styles.chatWrapper}>
      <div ref={chatRef} class={styles.chat}>
        <For each={chat()}>
          {(msg: MessageType) => {
            if (msg.serverMsg) {
              return <div><hr /><b>{msg.msg}</b><hr /></div>;
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
      <button class={styles.sendBtn} onClick={() => handleSendMessage()}>Send</button>
    </div>
  </div>
  )
}

export default Chat;

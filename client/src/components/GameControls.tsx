import type { Component, Setter } from "solid-js";
import type { Socket } from "socket.io-client";
import type { User } from "../App";
import { createSignal, Show } from "solid-js";
import { Icons } from "../assets/Icons";
import styles from "./GameControls.module.css";

const GameControls: Component<{
  socket: Socket,
  room: string,
  drawer: User,
  name: string,
  gameStarted: boolean,
  roundStarted: boolean,
  setRoom: Setter<string>
}> = (props) => {
  const [ready, setReady] = createSignal<boolean>(false);
  const [canStart, setCanStart] = createSignal<boolean>(false);
  const [mute, setMute] = createSignal<boolean>(false);

  const handleReady = () => {
    setReady(ready => !ready);
    props.socket.emit('player_ready', { room: props.room });
  }

	const handleStart = () => {
		props.socket.emit('start_game', { room: props.room });
	}

  const handleLeaveRoom = () => {
    props.socket.emit('leave_room', {
      room: props.room,
      name: props.name,
      socketId: props.socket.id
    });

    props.setRoom("lobby");
  }

  props.socket.on('can_start', canStart => setCanStart(canStart));

  return ( 
    <div class={styles.gameControlWrapper}>
      <Show when={!props.gameStarted}>
        <div
          class={ready() ?
            `${styles.divBtn} ${styles.unreadyBtn}`
            : `${styles.divBtn} ${styles.readyBtn}`}
          onClick={() => handleReady()}
          >
          {ready() ? 'Unready' : 'Ready'}
        </div>
          <Show
            when={props.name
                  && !props.roundStarted
                  && Object.keys(props.drawer)[0] === props.socket.id}
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
      </Show>
      <div class={styles.bottomControls}>
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
  )  
}

export default GameControls;

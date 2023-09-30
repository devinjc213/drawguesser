import type { Component, Setter } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import type { Socket } from "socket.io-client";
import type { User } from "../types/user.type";
import { user } from '../stores/UserStore';
import { game } from '../stores/GameStore';
import {createEffect, createSignal, Show} from "solid-js";
import { Icons } from "../assets/Icons";
import styles from "./GameControls.module.css";
import {Game} from "../types/game.type";

const GameControls: Component<{
  socket: Socket,
  setRoom: SetStoreFunction<Game>,
  setMute: Setter<boolean>,
  muted: boolean
}> = (props) => {
  const [ready, setReady] = createSignal<boolean>(false);
  const [canStart, setCanStart] = createSignal<boolean>(false);
  const [hintEnabled, setHintEnabled] = createSignal<boolean>(false);

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

    props.setRoom('roomName', 'lobby');
  }

  createEffect(() => {
    props.socket.on('can_start', canStart => {
      setCanStart(canStart);
      console.log(canStart);
    });
  });

  props.socket.on('hint_enabled', () => setHintEnabled(true));

  props.socket.on('players_in_room', (players: User[]) => {
    players.map(player => {
      if (player.socketId === props.socket.id) {
        setReady(player.ready ?? false);
      }
    });
  });

  return ( 
    <div class={styles.gameControlWrapper}>
      <Show when={props.socket.id === Object.keys(props.drawer)[0] && props.gameStarted && hintEnabled()} keyed>
        <div class={styles.hintControl}>
          <img
            src={Icons.Hint}
            alt="hint"
            height="60"
            width="60"
            onClick={() => {
              if (props.socket.id === Object.keys(props.drawer)[0])
                props.socket.emit('give_hint', { room: props.room });
            }}
          />
        </div>
      </Show>
      <Show when={!props.gameStarted} keyed>
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
           keyed>
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
            onClick={() => props.setMute(true)}
          />
          <Show when={props.muted} keyed>
            <img
              src={Icons.NoSign}
              class={styles.noSign}
              height="48"
              width="48"
              alt="unmute" 
              onClick={() => props.setMute(false)}
            />
          </Show>
        </div>
        <img src={Icons.LeaveRoom} alt="Leave room" onClick={() => handleLeaveRoom()} /> 
      </div>
    </div>
  )  
}

export default GameControls;

import type { Component, Setter } from "solid-js";
import type { Socket } from "socket.io-client";
import type { User } from "../types/user.type";
import { user } from '../stores/user.store';
import {game, setGame} from '../stores/game.store';
import {createEffect, createSignal, Show} from "solid-js";
import { Icons } from "../assets/Icons";
import styles from "./GameControls.module.css";

const GameControls: Component<{
  socket: Socket,
  setMute: Setter<boolean>,
  muted: boolean
}> = (props) => {
  const [ready, setReady] = createSignal<boolean>(false);
  const [canStart, setCanStart] = createSignal<boolean>(false);
  const [hintEnabled, setHintEnabled] = createSignal<boolean>(false);

  const handleReady = () => {
    setReady(ready => !ready);
    props.socket.emit('player_ready', { room: game.roomId });
  }

	const handleStart = () => {
		props.socket.emit('start_game', { room: game.roomId });
	}

  const handleLeaveRoom = () => {
    props.socket.emit('leave_room', {
      room: game.roomId,
      name: user.name,
      socketId: props.socket.id
    });

    setGame('roomName', 'lobby');
    setGame('roomId', '');
  }

  createEffect(() => {
    props.socket.on('can_start', canStart => {
      setCanStart(canStart);
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
      <Show when={props.socket.id === game.drawer.socketId && game.gameStarted && hintEnabled()} keyed>
        <div class={styles.hintControl}>
          <img
            src={Icons.Hint}
            alt="hint"
            height="60"
            width="60"
            onClick={() => {
              if (props.socket.id === game.drawer.socketId)
                props.socket.emit('give_hint', { room: game.roomId });
            }}
          />
        </div>
      </Show>
      <Show when={!game.gameStarted} keyed>
        <div
          class={ready() ?
            `${styles.divBtn} ${styles.unreadyBtn}`
            : `${styles.divBtn} ${styles.readyBtn}`}
          onClick={() => handleReady()}
          >
          {ready() ? 'Unready' : 'Ready'}
        </div>
          <Show
            when={user.name
                  && !game.roundStarted
                  && game.drawer.socketId === props.socket.id}
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

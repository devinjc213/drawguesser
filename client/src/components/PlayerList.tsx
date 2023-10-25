import type { Component } from "solid-js";
import type { User} from "../types/user.type";
import type { Socket } from "socket.io-client";
import {createEffect, createSignal, Show} from "solid-js";
import { Icons } from "../assets/Icons";
import {room} from '../stores/room.store';
import styles from "./PlayerList.module.css";

const PlayerList: Component<{
  socket: Socket
}> = (props) => {
  const [players, setPlayers] = createSignal<User[]>(room.users);

  createEffect(() => {
    setPlayers(room.users);
  })

  return (
    <div class={styles.playersWrapper}>
      <div class={styles.playersInRoom}>
        {players().map((player: User) => (
          <div class={styles.playerNameWrapper}>
              <span class={player.ready ? styles.greenText: ''}>
                {player.name}
                <Show when={player.socketId === room.drawer.socketId} keyed>
                  <img src={Icons.Pencil} height="16" width="16" alt="drawer" />
                </Show>
              </span>
            <span>
                <Show
                  when={player.ready}
                  fallback={player.score ?? 0}
                  keyed>
                  <img src={Icons.GreenCheck} width="10" height="10" alt="checkmark" />
                </Show>
              </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PlayerList;

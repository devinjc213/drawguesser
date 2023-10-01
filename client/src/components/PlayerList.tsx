import type { Component } from "solid-js";
import type { User} from "../types/user.type";
import type { Socket } from "socket.io-client";
import { createSignal, For, Show } from "solid-js";
import { Icons } from "../assets/Icons";
import {room} from '../stores/room.store';
import styles from "./PlayerList.module.css";

const PlayerList: Component<{
  socket: Socket
}> = (props) => {
  const [playersInRoom, setPlayersInRoom] = createSignal<User[]>([]);

  props.socket.on('players_in_room', (players: User[]) => {
    setPlayersInRoom(players);
  });

  props.socket.on('room_init', (user) => {
    setPlayersInRoom(user);
  });

  return (
    <div class={styles.playersWrapper}>
      <div class={styles.playersInRoom}>
        <For each={playersInRoom()}>
          {(player: User) => (
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
          )}
        </For>  
      </div>
    </div>
  )
}

export default PlayerList;

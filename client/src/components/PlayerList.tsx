import type { Component } from "solid-js";
import type { User} from "../App";
import type { Socket } from "socket.io-client";
import { createSignal, For, Show } from "solid-js";
import { Icons } from "../assets/Icons";
import styles from "./PlayerList.module.css";

const PlayerList: Component<{
  socket: Socket,
}> = (props) => {
  const [playersInRoom, setPlayersInRoom] = createSignal<User[]>([]);

  props.socket.on('players_in_room', (players) => {
    setPlayersInRoom(players);
  });

  props.socket.on('room_init', user => {
    setPlayersInRoom(user);
  });

  return (
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
  )
}

export default PlayerList;

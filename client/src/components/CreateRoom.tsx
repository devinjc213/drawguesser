import type { Component } from "solid-js";
import {createSignal, onCleanup, onMount} from "solid-js";
import styles from './CreateRoom.module.css';
import {Socket} from "socket.io-client";
import {user} from "../stores/user.store";

export type RoomSettings = {
  name: string
  maxPlayers: number
  numberOfRounds: number
  roundTimer: number
  maxHints: number
  hintsEnabledAfter: number
  words: string
  playerName: string
}
const CreateRoom: Component<{socket: Socket}> = (props) => {
  const [roomSettings, setRoomSettings] = createSignal<RoomSettings>({
    name: "",
    maxPlayers: 8,
    numberOfRounds: 3,
    roundTimer: 80,
    maxHints: 3,
    hintsEnabledAfter: 30,
    words: "",
    playerName: user.name,
  });
  let roomNameRef: any;

  onMount(() => {
    roomNameRef.focus();

    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleCreateRoom();
      }
    });
  });

  onCleanup(() => {
    document.removeEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleCreateRoom();
      }
    });
  })

  const handleCreateRoom = () => {
    props.socket.emit('create_room', roomSettings());
  }

  return (
    <div class={styles.form}>
      <label>Room name:</label>
      <input
        type="text"
        value={roomSettings().name}
        onInput={(e) => setRoomSettings({
          ...roomSettings(),
          name: e.currentTarget.value
        })}
        ref={roomNameRef}
      />
      <label>Round timer:</label>
      <input
        type="number"
        value={roomSettings().roundTimer}
        onInput={(e) => setRoomSettings({
          ...roomSettings(),
          roundTimer: parseInt(e.currentTarget.value)
        })}
      />
      <label>Number of rounds: {roomSettings().numberOfRounds}</label>
      <input
        type="range"
        min="3"
        max="10"
        step="1"
        value={roomSettings().numberOfRounds}
        onInput={(e) => setRoomSettings({
          ...roomSettings(),
          numberOfRounds: parseInt(e.currentTarget.value)
        })}
      />
      <label>Max number of players: {roomSettings().maxPlayers}</label>
      <input
        type="range"
        min="2"
        max="12"
        step="1"
        value={roomSettings().maxPlayers}
        onInput={(e) => setRoomSettings({
          ...roomSettings(),
          maxPlayers: parseInt(e.currentTarget.value)
        })}
      />
      <label>Max number of hints: {roomSettings().maxHints}</label>
      <input
        type="range"
        min="0"
        max="5"
        step="1"
        value={roomSettings().maxHints}
        onInput={(e) => setRoomSettings({
          ...roomSettings(),
          maxHints: parseInt(e.currentTarget.value)
        })}
      />
      <label>Hints enabled after X seconds:</label>
      <input
        type="number"
        value={roomSettings().hintsEnabledAfter}
        onInput={(e) => setRoomSettings({
          ...roomSettings(),
          hintsEnabledAfter: parseInt(e.currentTarget.value)
        })}
      />
      <label>Extra words, separate by comma:</label>
      <input
        type="textarea"
        value={roomSettings().words}
        onInput={(e) => setRoomSettings({
          ...roomSettings(),
          words: e.currentTarget.value
        })}
      />
      <button onClick={handleCreateRoom}>Create Room</button>
    </div>
  );
}

export default CreateRoom;
import type { Component } from "solid-js";
import { createSignal } from "solid-js";
import styles from './CreateRoom.module.css';
import {Socket} from "socket.io-client";
import {user} from "../stores/user.store";

export type RoomSettings = {
  name: string
  playerName: string
  roundTimer: number
  numberOfRounds: number
  maxNumberOfPlayers: number
  maxHintsGiven: number
  hintEnabledAfter: number
  words: string
}
const CreateRoom: Component<{socket: Socket}> = (props) => {
  const [roomSettings, setRoomSettings] = createSignal<RoomSettings>({
    name: "",
    playerName: user.name,
    roundTimer: 80,
    numberOfRounds: 3,
    maxNumberOfPlayers: 8,
    maxHintsGiven: 2,
    hintEnabledAfter: 30,
    words: ""
  });

  const handleCreateRoom = () => {
    console.log(roomSettings());
    props.socket.emit('create_room', roomSettings());
  }

  return (
    <div class={styles.form}>
      <label>Room name:</label>
      <input
        type="text"
        value={roomSettings().name}
        onInput={(e) => setRoomSettings({ ...roomSettings(), name: e.currentTarget.value })}
      />
      <label>Round timer:</label>
      <input
        type="number"
        value={roomSettings().roundTimer}
        onInput={(e) => setRoomSettings({ ...roomSettings(), roundTimer: parseInt(e.currentTarget.value) })}
      />
      <label>Number of rounds: {roomSettings().numberOfRounds}</label>
      <input
        type="range"
        min="3"
        max="10"
        step="1"
        value={roomSettings().numberOfRounds}
        onInput={(e) => setRoomSettings({ ...roomSettings(), numberOfRounds: parseInt(e.currentTarget.value) })}
      />
      <label>Max number of players: {roomSettings().maxNumberOfPlayers}</label>
      <input
        type="range"
        min="2"
        max="12"
        step="1"
        value={roomSettings().maxNumberOfPlayers}
        onInput={(e) => setRoomSettings({ ...roomSettings(), maxNumberOfPlayers: parseInt(e.currentTarget.value) })}
      />
      <label>Max number of hints: {roomSettings().maxHintsGiven}</label>
      <input
        type="range"
        min="0"
        max="5"
        step="1"
        value={roomSettings().maxHintsGiven}
        onInput={(e) => setRoomSettings({ ...roomSettings(), maxHints: parseInt(e.currentTarget.value) })}
      />
      <label>Hints enabled after X seconds:</label>
      <input
        type="number"
        value={roomSettings().hintEnabledAfter}
        onInput={(e) => setRoomSettings({ ...roomSettings(), hintEnabledAfter: parseInt(e.currentTarget.value) })}
      />
      <label>Extra words, separate by comma:</label>
      <input
        type="textarea"
        value={roomSettings().words}
        onInput={(e) => setRoomSettings({ ...roomSettings(), words: e.currentTarget.value })}
      />
      <button onClick={handleCreateRoom}>Create Room</button>
    </div>
  );
}

export default CreateRoom;
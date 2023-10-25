import { createSignal, Show, For } from "solid-js";
import type { Component } from 'solid-js';
import CreateRoom from './CreateRoom';
import styles from "./RoomBrowser.module.css";
import type { Socket } from 'socket.io-client';
import {Room} from "../types/room.type";
import {user} from "../stores/user.store";
import {browserRooms, setRoom} from "../stores/room.store";

const RoomBrowser: Component<{
	socket: Socket,
}> = (props) => {
	const [selectedRoom, setSelectedRoom] = createSignal<Room>();
	const [showCreateModal, setShowCreateModal] = createSignal<boolean>(false);

	return (
		<div class={styles.roomContainer}>
			<Show when={!showCreateModal()} keyed>
				<div class={styles.roomList}>
					{browserRooms.map((room: Room) => (
						<div
							class={selectedRoom()?.name === room.name ? `${styles.roomName} ${styles.selected}` : styles.roomName}
							onClick={() => setSelectedRoom(room)}
						>
							{room.name}
						</div>
					))}
				</div>
				<div class={styles.btnRow}>
					<button
						onClick={() => {
							if (!selectedRoom()) return;
							setRoom(selectedRoom()!);
							props.socket.emit('join_room', { name: user.name, room: selectedRoom()?.id } );
						}}
						class={selectedRoom() ? styles.btn : `${styles.btn} ${styles.btnDisabled}`}
						disabled={!selectedRoom()}
					>
							Join
						</button>
					<button class={styles.btn} onClick={() => setShowCreateModal(true)}>Create</button>
				</div>
			</Show>
			<Show when={showCreateModal()} keyed>
				<CreateRoom socket={props.socket} />
			</Show>
		</div>
	)
}

export default RoomBrowser;

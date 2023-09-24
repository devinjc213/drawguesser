import { createSignal, createEffect, Show, For } from "solid-js";
import type { Component, Setter } from 'solid-js';
import NameModal from './NameModal';
import CreateRoom from './CreateRoom';
import styles from "./RoomBrowser.module.css";
import type { Socket } from 'socket.io-client';

const RoomBrowser: Component<{getRoom: Setter<string>, socket: Socket , name: string, initialRooms: string[] }> = (props) => {
	const [selectedRoom, setSelectedRoom] = createSignal<string>("");
	const [roomList, setRoomList] = createSignal<string[]>(props.initialRooms);
	const [showCreateModal, setShowCreateModal] = createSignal<boolean>(false);
	const [createRoomName, setCreateRoomName] = createSignal<string>("");

	createEffect(() => {
		if (createRoomName()) {
			setShowCreateModal(false);
			props.socket.emit('create_room', { room: createRoomName(), name: props.name });
		}	
	});

	props.socket.on('room_update', rooms => {
		setRoomList(rooms);
	});

	return (
		<div class={styles.roomContainer}>
			<Show when={!showCreateModal()} keyed>
				<div class={styles.roomList}>
					<For each={roomList()}>
						{(room: string) => (
							<div
								class={selectedRoom() === room ? `${styles.roomName} ${styles.selected}` : styles.roomName}
								onClick={() => setSelectedRoom(room)}
							>
								{room}
							</div>
						)}
					</For>
				</div>
				<div class={styles.btnRow}>
					<button
						onClick={() => {
							props.getRoom(selectedRoom());
							props.socket.emit('join_room', { name: props.name, room: selectedRoom() } );
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

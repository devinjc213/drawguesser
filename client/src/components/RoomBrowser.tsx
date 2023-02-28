import { createSignal, createEffect, Show } from "solid-js";
import type { Component, Setter } from 'solid-js';
import NameModal from './NameModal';
import styles from "./RoomBrowser.module.css";
import type { Socket } from 'socket.io-client';

const RoomBrowser: Component<{getRoom: Setter<string>, socket: Socket , name: string }> = (props) => {
	const [selectedRoom, setSelectedRoom] = createSignal<string>("");
	const [roomList, setRoomList] = createSignal<string[]>([]);
	const [showCreateModal, setShowCreateModal] = createSignal<boolean>(false);
	const [createRoomName, setCreateRoomName] = createSignal<string>("");

	createEffect(() => {
		if (createRoomName()) {
			setShowCreateModal(false);
			props.socket.emit('create_room', { room: createRoomName(), name: props.name });
		}	
	});

	props.socket.on('room_update', rooms => {
		setRoomList(rooms.filter((room: string) => room !== "lobby"))
	});

	return (
		<div class={styles.roomContainer}>
			<div class={styles.roomList}>
				{roomList().length > 0 && roomList().map(room => (
					<div class={selectedRoom() === room ? `${styles.roomName} ${styles.selected}` : styles.roomName} onClick={() => setSelectedRoom(room)}>
						{room}
					</div>
				))}
			</div>
			<button onClick={() => {
				props.getRoom(selectedRoom());
				props.socket.emit('join_room', { name: props.name, room: selectedRoom() } );
			}}>Join</button>
			<button onClick={() => setShowCreateModal(true)}>Create</button>
			<Show when={showCreateModal()}>
				<NameModal getName={setCreateRoomName} /> 
			</Show>
		</div>
	)
}

export default RoomBrowser;

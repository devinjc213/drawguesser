import { createSignal, createEffect, Show, For } from "solid-js";
import type { Component, Setter } from 'solid-js';
import type { SetStoreFunction } from "solid-js/store";
import type { Game } from "../types/game.type";
import CreateRoom from './CreateRoom';
import styles from "./RoomBrowser.module.css";
import type { Socket } from 'socket.io-client';
import {Room} from "../types/room.type";
import {user} from "../stores/user.store";

const RoomBrowser: Component<{
	getRoom: SetStoreFunction<Game>,
	socket: Socket,
}> = (props) => {
	const [selectedRoom, setSelectedRoom] = createSignal<Room>();
	const [roomList, setRoomList] = createSignal<Room[]>();
	const [showCreateModal, setShowCreateModal] = createSignal<boolean>(false);

	props.socket.on('room_update', rooms => {
		setRoomList(rooms);
	});

	props.socket.on('initial_rooms', (rooms) => setRoomList(rooms));

	return (
		<div class={styles.roomContainer}>
			<Show when={!showCreateModal()} keyed>
				<div class={styles.roomList}>
					<For each={roomList()}>
						{(room: Room) => (
							<div
								class={selectedRoom()?.name === room.name ? `${styles.roomName} ${styles.selected}` : styles.roomName}
								onClick={() => setSelectedRoom(room)}
							>
								{room.name}
							</div>
						)}
					</For>
				</div>
				<div class={styles.btnRow}>
					<button
						onClick={() => {
							props.getRoom('roomName', selectedRoom()!.name);
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

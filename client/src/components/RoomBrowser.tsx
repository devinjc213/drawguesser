import { createSignal, Show, For } from "solid-js";
import type { Component } from 'solid-js';
import CreateRoom from './CreateRoom';
import styles from "./RoomBrowser.module.css";
import type { Socket } from 'socket.io-client';
import {Room} from "../types/room.type";
import {user} from "../stores/user.store";
import {setRoom} from "../stores/room.store";
import {User} from "../types/user.type";

type RoomBrowser = {
	id: string
	name: string
	players: User[]
	drawer: User
	gameStarted: boolean
	roundStarted: boolean
	currentRound: number
	numberOfRounds: number
}

const RoomBrowser: Component<{
	socket: Socket,
}> = (props) => {
	const [selectedRoom, setSelectedRoom] = createSignal<RoomBrowser>();
	const [roomList, setRoomList] = createSignal<RoomBrowser[]>();
	const [showCreateModal, setShowCreateModal] = createSignal<boolean>(false);

	props.socket.on('room_update', rooms => setRoomList(rooms));

	return (
		<div class={styles.roomContainer}>
			<Show when={!showCreateModal()} keyed>
				<div class={styles.roomList}>
					<For each={roomList()}>
						{(room: RoomBrowser) => (
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
							setRoom('name', selectedRoom()!.name);
							setRoom('id', selectedRoom()!.id);
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

import {createStore} from 'solid-js/store';
import type {Room} from "../types/room.type";
import {game, setGame} from "./game.store";
import {User} from "../types/user.type";
import {createEffect} from "solid-js";

export const [browserRooms, setBrowserRooms] = createStore<Room[]>([]);
export const [room, setRoom] = createStore<Room>({
  socket: null,
  id: "",
  name: "lobby",
  users: [],
  drawer: {
    socketId: "",
    name: "",
    score: 0,
  },
  maxPlayers: 0,
  roundStarted: false,
  numberOfRounds: 0,
  maxHints: 0,
  hintsEnabledAfter: 0
});

// function updateUrl() {
//   const url = new URL(window.location.href);
//   const string = url.toString() + room.id;
//   window.history.pushState({}, '', string);
// }

createEffect(() => {
  // updateUrl();

  if (room.socket) {
    room.socket.on('round_end', (curRound: number) => {
      setRoom('roundStarted', false);
      setGame('currentRound', curRound);
      setGame('selectedWord', '');
    });

    room.socket.on('create_join_room', (room: { id: string, name: string }) => {
      console.log(room);
      setRoom('id', room.id);
      setRoom('name', room.name)
    });

    room.socket.on('drawer_update', (drawer: User) => setRoom('drawer', drawer));

    room.socket.on('round_start', () => setRoom('roundStarted', true));

    room.socket.on('room_update', (rooms: Room[]) => {
      setBrowserRooms(rooms);
    });

    room.socket.on('players_in_room', (players: User[]) => {
      console.log('players', players);
      setRoom('users', players);
    });
  }
});


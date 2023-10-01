import {createStore} from 'solid-js/store';
import type {Room} from "../types/room.type";
import {game, setGame} from "./game.store";
import {User} from "../types/user.type";
import {createEffect} from "solid-js";
export const [room, setRoom] = createStore<Room>({
  socket: null,
  id: "",
  name: "lobby",
  users: [],
  drawer: {
    name: "",
    socketId: "",
    score: 0,
  },
  maxPlayers: 0,
  roundStarted: false,
  numberOfRounds: 0,
  maxHints: 0,
  hintsEnabledAfter: 0
});

function updateUrl() {
  const url = new URL(window.location.href);
  const string = url.toString() + room.id;
  window.history.pushState({}, '', string);
}

createEffect(() => {
  updateUrl();

  if (room.socket) {
    room.socket.on('round_end', (curRound: number) => {
      setRoom('roundStarted', false);
      setGame('currentRound', curRound);
      setGame('selectedWord', '');
    });

    room.socket.on('create_join_room', (room: { id: string, name: string }) => {
      setRoom('id', room.id);
      setRoom('name', room.name)
      console.log('setting room id');
    });

    room.socket.on('drawer_update', (drawer: User) => setRoom('drawer', drawer));

    room.socket.on('round_start', () => setRoom('roundStarted', true));
  }
});


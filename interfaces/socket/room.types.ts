import {User} from "../user/user.types";
import {Room} from "../game/room.types";

export type PlayerJoinLeave = {
  roomId: string
  user: User
}

export type CreateRoom = {
  roomId: string
  name: string
  playerName: string
  roundTimer: number
  numberOfRounds: number
  maxNumberOfPlayers: number
  maxHintsGiven: number
  hintEnabledAfter: number
  words: string
}

export type PlayersInRoom = User[];

export type RoomUpdate = Room[];

import {User} from "./user.type";
import {Socket} from "socket.io-client";

export type Room = {
  socket: Socket | null
  id: string
  name: string
  users: User[]
  drawer: User
  maxPlayers: number
  roundStarted: boolean
  numberOfRounds: number
  maxHints: number
  hintsEnabledAfter: number
}
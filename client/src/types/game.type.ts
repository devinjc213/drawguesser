import {User} from "./user.type";
import {Socket} from "socket.io-client";

export type Game = {
  socket: Socket | null
  roomName: string
  drawer: User
  selectedWord: string
  currentWord: string
  gameStarted: boolean
  roundStarted: boolean
  currentRoundTimer: number
  currentRound: number
  currentIntermissionTimer: number
  isGameOver: boolean
  muted: boolean
}
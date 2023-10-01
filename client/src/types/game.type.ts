import {Socket} from "socket.io-client";

export type Game = {
  socket: Socket | null
  selectedWord: string
  gameStarted: boolean
  isGameOver: boolean
  drawWords: string[]
  muted: boolean
  currentRound: number
  extraWords: string[]
  currentRoundTimer: number
  currentIntermissionTimer: number
}
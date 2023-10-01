import {User} from "../user/user.types";

export type Room = {
  id: string
  name: string
  users: User[]
  gameStarted: boolean
  roundStarted: boolean
  currentRound: number
  numOfRounds: number
  maxPlayers: number
  maxHints: number
  hintsEnabledAfter: number
  extraWords: string[]
  currentWord: string
}
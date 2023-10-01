import {User} from "../user/user.types";

export type Message = {
  type: 'user' | 'server' | 'hint'
  msg: string
  user?: User
  roomId: string
}
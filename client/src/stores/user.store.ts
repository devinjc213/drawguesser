import { createStore } from 'solid-js/store';
import { User } from '../types/user.type';

export const [user, setUser] = createStore<User>({
  name: "",
  socketId: "",
  score: 0,
  ready: false
});
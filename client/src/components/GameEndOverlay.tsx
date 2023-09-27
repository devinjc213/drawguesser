import type {Component} from "solid-js";
import {createSignal, Index} from "solid-js";
import styles from "./GameEndOverlay.module.css";
import {Socket} from "socket.io-client";

export type User = {
  [key: string]: {
    name: string
    score: number
    ready?: boolean
  }
}

type Winners = {
  name: string
  score: number
}

const GameEndOverlay: Component<{socket: Socket, room: string}> = (props) => {
  const [winners, setWinners] = createSignal<Winners[]>([]);

  props.socket.on('final_scores', (data: User[]) => {
    data.map(player => {
      setWinners(winners => [
        ...winners,
        {
          name: Object.values(player)[0].name,
          score: Object.values(player)[0].score
        }]);

    });
  });

  const playAgain = () => {
    props.socket.emit('play_again', { room: props.room });
  }

  return (
    <div class={styles.overlay}>
      <div class={styles.endCard}>
        <h2 class={styles.title}>Game Over</h2>
        <div class={styles.players}>
          {winners().map((winner, index) => {
            if (index === 0) {
              return (
                <div class={styles.winner}>
                  <div class={styles.winnerName}>{index+1}. {winner.name}</div>
                  <div class={styles.winnerScore}>{winner.score}</div>
                </div>
              )
            } else {
              return (
                <div class={styles.loser}>
                  <div class={styles.loserName}>{index+1}. {winner.name}</div>
                  <div class={styles.loserScore}>{winner.score}</div>
                </div>
              )
            }
          })}
        </div>
        <button onclick={playAgain}>Play again?</button>
      </div>
    </div>
  )
}

export default GameEndOverlay;
import type { Component } from "solid-js";
import type { Socket } from "socket.io-client";
import { For } from "solid-js";
import { game } from "../stores/game.store";
import styles from "./ChooseWordOverlay.module.css";

const ChooseWordOverlay: Component<{
  socket: Socket,
}> = (props) => {
  
  const handleSelection = (word: string) => {
    props.socket.emit('selected_word', { room: game.roomId, word: word });
  }

  return (
    <div class={styles.overlay}>
      <h2 class={styles.title}>Select a word to draw</h2>
      <div class={styles.wordsWrapper}>
        <For each={game.drawWords}>
          {(word: string) => {
            return  (
              <div 
                class={styles.word}
                onClick={() => handleSelection(word)}
              >
                {word}
              </div>
            )
          }}
        </For>
      </div>
    </div>
  )
}

export default ChooseWordOverlay;

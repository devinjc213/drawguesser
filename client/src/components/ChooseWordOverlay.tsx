import type { Component } from "solid-js";
import type { Socket } from "socket.io-client";
import { For, createSignal } from "solid-js";
import styles from "./ChooseWordOverlay.module.css";

const ChooseWordOverlay: Component<{
  socket: Socket,
  room: string,
  words: string[]
}> = (props) => {
  
  const handleSelection = (word: string) => {
    props.socket.emit('selected_word', { room: props.room, word: word }); 
  }

  return (
    <div class={styles.overlay}>
      <h2 class={styles.title}>Select a word to draw</h2>
      <div class={styles.wordsWrapper}>
        <For each={props.words}>
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

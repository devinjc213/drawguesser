import type {Component} from "solid-js";
import {createSignal, For, Show, createEffect} from "solid-js";
import {Socket} from "socket.io-client";
import styles from "./Hint.module.css";

export type HintChars = {
  index: number
  letter: string
};

const Hint: Component<{socket: Socket}> = (props) => {
  const [hint, setHint] = createSignal<(string | null)[]>([]);
  const [hintCount, setHintCount] = createSignal<number>(0);

  createEffect(() => {
    props.socket.on('hint_letter', (data: HintChars) => {
      setHint((prevHint) => {
        const newHint = [...prevHint];
        newHint[data.index] = data.letter;
        return newHint;
      });
    });
  });

  props.socket.on('hint_length', (length: number) => {
    setHint(new Array(length).fill(null));
  });

  props.socket.on('hint_count', (count: number) => setHintCount(count));

  props.socket.on('round_end', () => {
    setHint([]);
    setHintCount(0);
  });

  return (
    <Show when={hintCount() > 0} keyed>
      <div class={styles.container}>
        <span class={styles.preText}>Hint: </span>
        {hint().map((char, index) => (
          <span>
            {char ? <span class={styles.hint}>{char}</span> : <span class={styles.underline} /> }
          </span>
        ))}
      </div>
    </Show>
  );
}

export default Hint;
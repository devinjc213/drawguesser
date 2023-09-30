import {Component, onMount, createSignal, createEffect, onCleanup } from 'solid-js';
import type { SetStoreFunction } from "solid-js/store";
import type { User } from '../types/user.type';
import styles from './NameModal.module.css';

const NameModal: Component<{setName: SetStoreFunction<User>}> = (props) => {
  const [name, setName] = createSignal<string>("");
  let inputRef: any;
  
  const submitName = (e: any) => {
    if (e.key === "Enter") props.setName('name', name());
  }

  onMount(() => {
    inputRef.focus();

    document.addEventListener("keydown", submitName);  
  });

  onCleanup(() => {
      document.removeEventListener("keydown", submitName);
  });

  return (
    <div class={styles.overlay}>
      <div class={styles.modal}>
        <span>Please input a name:</span>
        <input ref={inputRef} onInput={e => setName(e.currentTarget.value)} />
       </div>
    </div>
    );
}

export default NameModal;

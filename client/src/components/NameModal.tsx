import {Component, onMount, createSignal, onCleanup } from 'solid-js';
import { user, setUser } from '../stores/user.store';
import styles from './NameModal.module.css';

const NameModal: Component = (props) => {
  const [name, setName] = createSignal<string>("");
  let inputRef: any;
  
  const submitName = (e: any) => {
    if (e.key === "Enter") setUser('name', name());
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

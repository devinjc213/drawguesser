import {Component, onMount, createSignal, onCleanup, Setter} from 'solid-js';
import styles from './NameModal.module.css';

const NameModal: Component<{getName: Setter<string>}> = (props) => {
  const [name, setName] = createSignal<string>("");
  
  const submitName = (e: any) => {
    if (e.key === "Enter") props.getName(name()); 
  }

  onMount(() => {
    document.addEventListener("keydown", submitName);  
  });

  onCleanup(() => {
      document.removeEventListener("keydown", submitName);
  });

  return (
    <div class={styles.overlay}>
      <div class={styles.modal}>
        <span>Please input a name:</span>
        <input oninput={e => setName(e.currentTarget.value)} />
       </div>
    </div>
    );
}

export default NameModal;

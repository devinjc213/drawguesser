import type {Component, Setter} from 'solid-js';
import styles from './NameModal.module.css';

const NameModal: Component<{getName: Setter<string>}> = (props) => {
    return (
        <div class={styles.overlay}>
            <div class={styles.modal}>
                <span>Please input a name:</span>
                <input onChange={e => props.getName(e.currentTarget.value)} />
            </div>
        </div>
    );
}

export default NameModal;

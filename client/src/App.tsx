import { createSignal, createEffect, onMount, onCleanup } from 'solid-js';
import type { Component } from 'solid-js';
import { io } from "socket.io-client";

import styles from './App.module.css';

const socket = io("http://localhost:4000"); 

const App: Component = () => {
	const [name, setName] = createSignal<string>("boose");
	const [chat, setChat] = createSignal<string[]>([""]);
	const [message, setMessage] = createSignal<string>("");
	const [drawColor, setDrawColor] = createSignal<string>("#aaaaaa");
	const [pos, setPos] = createSignal<{ x: number, y: number}>({x:0,y:0});
	let canvas: any;
	let ctx: any;
	let lastX: number;
	let lastY: number;


	onMount(() => {
		ctx = canvas.getContext("2d");
		ctx.fillStyle = "white";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		let rect = canvas.getBoundingClientRect();
		
		document.addEventListener("keypress", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				handleSendMessage();
			}
		});

		const handlePos = (e: any) => {
			setPos({
				x: (e.clientX - rect.left) / (rect.right - rect.left) * canvas.width,
        		y: (e.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height
			});
		}

		const draw = (e: any) => {
			if (e.buttons !== 1) return;

			ctx.beginPath();

			ctx.lineWidth = 5;
			ctx.lineCap = 'round';
			ctx.strokeStyle = drawColor();

			ctx.moveTo(pos().x, pos().y);
			handlePos(e);	
			ctx.lineTo(pos().x, pos().y);

			ctx.stroke();
		
			socket.emit('canvas_emit', { x: pos().x, y: pos().y, color: drawColor(), id: socket.id });
		};

		const clearPos = () => {
			setPos({ x: 0, y: 0 });
			socket.emit('clear_pos', true);
		}

		document.addEventListener('mousemove', draw);
		document.addEventListener('mousedown', handlePos);
		document.addEventListener('mouseup', clearPos);
		document.addEventListener('mouseEnter', handlePos);
	});

	const emitDraw = (x: number, y: number) => {
		ctx.beginPath();

		ctx.lineWidth = 5;
		ctx.lineCap = 'round';
		ctx.strokeStyle = drawColor();
		
		if (lastX && lastY) {
			ctx.moveTo(lastX, lastY);
			ctx.lineTo(x, y);
		}

		ctx.stroke();

		lastX = x;
		lastY = y;
	}

	const handleSendMessage = () => {
		if (!message) return;

		socket.emit('message', message());
		setMessage("");
	}

	socket.on('canvas_emit', data => {
		console.log(socket);
		if (data.id !== socket.id) emitDraw(data.x, data.y);
	});

	socket.on('message', msg => {
		setChat(chat => [...chat, msg]);
	});

	socket.on('clear_pos', clearPos => {
		lastX = 0;
		lastY = 0;
	});
	
  return (
    <div class={styles.App}>
			<div class={styles.gameContainer}>
				<div class={styles.chat}>
					<div class={styles.chatBox}>
					{chat().length > 1 
						? chat().map(msg => <div class={styles.chatMsg}><span>{name()}:</span>{msg}</div>) 
						: <div>{chat()}</div>}
					</div>
					<input class={styles.textInput} onInput={(e) => setMessage(e.currentTarget.value)} value={message()} />
					<button onClick={handleSendMessage}>send</button>
				</div>
				<canvas ref={canvas} width="750" height="500"></canvas>
			</div>
    </div>
  );
};

export default App;

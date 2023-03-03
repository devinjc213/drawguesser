import type { Component } from "solid-js";
import {createSignal, onCleanup, onMount} from "solid-js";
import type { Socket } from "socket.io-client";
import { Icons } from '../assets/Icons';
import ControlImage from '../components/ControlImage';
import styles from './Canvas.module.css';

const Canvas: Component<{ socket: Socket, isDrawer: boolean }> = (props) => {
  const [paintTool, setPaintTool] = createSignal<"brush" | "bucket">("brush");
	const [drawColor, setDrawColor] = createSignal<string>("#000");
	const [brushSize, setBrushSize] = createSignal<number>(5);
	const [pos, setPos] = createSignal<{ x: number, y: number}>({x:0,y:0});
	let rect: any;
	let canvas: any;
	let ctx: any;
	let lastX: number;
	let lastY: number;

	onMount(() => {
    ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    document.addEventListener('mousemove', draw);
    document.addEventListener('mousedown', handlePos);
    document.addEventListener('mouseup', clearPos);
    document.addEventListener('mouseEnter', handlePos);
  });

	onCleanup(() => {
    document.removeEventListener('mousemove', draw);
    document.removeEventListener('mousedown', handlePos);
    document.removeEventListener('mouseup', clearPos);
    document.removeEventListener('mouseEnter', handlePos);
  });

	const handleBrushSize = (e: any) => {
		setBrushSize(e.currentTarget.value);
	}

	const handleClear = () => {
		ctx.fillStyle = "white";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}

	const handlePos = (e: any) => {
		rect = canvas.getBoundingClientRect();

		setPos({
			x: (e.clientX - rect.left) / (rect.right - rect.left) * canvas.width,
			y: (e.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height
		});
	}

	const draw = (e: any) => {
		if (e.buttons !== 1 || !props.isDrawer) return;
		ctx.beginPath();

		ctx.lineWidth = brushSize();
		ctx.lineCap = 'round';
		ctx.strokeStyle = drawColor();

		ctx.moveTo(pos().x, pos().y);
		handlePos(e);
		ctx.lineTo(pos().x, pos().y);

		ctx.stroke();

		props.socket.emit('canvas_emit', { x: pos().x, y: pos().y, color: drawColor(), brushSize: brushSize(), id: props.socket.id });
	};

	const clearPos = () => {
		setPos({ x: 0, y: 0 });
		props.socket.emit('clear_pos', true);
	}

	const emitDraw = (x: number, y: number, color: string, brushSize: number) => {
		ctx.beginPath();

		ctx.lineWidth = brushSize;
		ctx.lineCap = 'round';
		ctx.strokeStyle = color;

		if (lastX && lastY) {
			ctx.moveTo(lastX, lastY);
			ctx.lineTo(x, y);
		}

		ctx.stroke();

		lastX = x;
		lastY = y;
	}

	props.socket.on('canvas_emit', data => {
    if (data.id !== props.socket.id) emitDraw(data.x, data.y, data.color, data.brushSize);
  });

	props.socket.on('clear_pos', clearPos => {
    lastX = 0;
    lastY = 0;
  });

	props.socket.on('clear_canvas', (data) => {
    if (data.id !== props.socket.id) handleClear();
  });

	return (
		<div class={styles.canvasContainer}>
      <div class={styles.canvasWrapper}>
        <canvas ref={canvas} width="650" height="500"></canvas>
      </div>
			<div class={styles.controls}>
        <div class={styles.brushSizeContainer}>
          <div style={{
              width: `${brushSize()}px`,
              height: `${brushSize()}px`,
              'border-radius': "50%",
              background: drawColor(),
              position: "absolute",
              top: "40%",
              left: "50%",
              transform: "translate(-50%, -50%)"
            }}></div>
          <input type="range" min="1" max="50" step="1" value={brushSize()} oninput={(e) => handleBrushSize(e)} />
        </div>
        <div class={styles.paintTools}>            
          <img
            src={Icons.PaintBrush}
            class={paintTool() === "brush" ? styles.activeToolLeft : ""}
            height="26"
            width="26"
            alt="Eraser"
            onClick={() => setPaintTool("brush")}
          />
          <img
            src={Icons.PaintBucket}
            class={paintTool() === "bucket" ? styles.activeToolRight : ""}
            height="26"
            width="26"
            alt="Clear canvas"
            onClick={() => setPaintTool("bucket")}
          />
        </div>
				<div class={styles.colorContainer}>
					<div class={styles.colorRow}>
						<div class={styles.colorSquare} style={{background: "#000"}} onclick={() => setDrawColor("#000")} />
						<div class={styles.colorSquare} style={{background: "#545454"}} onclick={() => setDrawColor("#545454")} />
						<div class={styles.colorSquare} style={{background: "#804000"}} onclick={() => setDrawColor("#804000")} />
						<div class={styles.colorSquare} style={{background: "#FE0000"}} onclick={() => setDrawColor("#FE0000")} />
						<div class={styles.colorSquare} style={{background: "#FE6A00"}} onclick={() => setDrawColor("#FE6A00")} />
						<div class={styles.colorSquare} style={{background: "#FFD800"}} onclick={() => setDrawColor("#FFD800")} />
						<div class={styles.colorSquare} style={{background: "#00FE20"}} onclick={() => setDrawColor("#00FE20")} />
						<div class={styles.colorSquare} style={{background: "#0094FE"}} onclick={() => setDrawColor("#0094FE")} />
						<div class={styles.colorSquare} style={{background: "#0026FF"}} onclick={() => setDrawColor("#0026FF")} />
						<div class={styles.colorSquare} style={{background: "#B100FE"}} onclick={() => setDrawColor("#B100FE")} />
					</div>
          <div class={styles.colorRow}>
            <div class={styles.colorSquare} style={{background: "#fff"}} onclick={() => setDrawColor("#fff")} />
            <div class={styles.colorSquare} style={{background: "#A8A8A8"}} onclick={() => setDrawColor("#A8A8A8")} />
            <div class={styles.colorSquare} style={{background: "#401F00"}} onclick={() => setDrawColor("#401F00")} />
            <div class={styles.colorSquare} style={{background: "#800001"}} onclick={() => setDrawColor("#800001")} />
            <div class={styles.colorSquare} style={{background: "#803400"}} onclick={() => setDrawColor("#803400")} />
            <div class={styles.colorSquare} style={{background: "#806B00"}} onclick={() => setDrawColor("#806B00")} />
            <div class={styles.colorSquare} style={{background: "#007F0E"}} onclick={() => setDrawColor("#007F0E")} />
            <div class={styles.colorSquare} style={{background: "#00497E"}} onclick={() => setDrawColor("#00497E")} />
            <div class={styles.colorSquare} style={{background: "#001280"}} onclick={() => setDrawColor("#001280")} />
            <div class={styles.colorSquare} style={{background: "#590080"}} onclick={() => setDrawColor("#590080")} />
          </div>
				</div>
        <img
          src={Icons.TrashCan}
          height="48"
          width="48"
          style={{ cursor: "pointer" }}
          onClick={() => {
            handleClear();
            props.socket.emit("clear_canvas", true);
          }}
          alt="Clear canvas"
        />
			</div> 
		</div>
	);
}

export default Canvas;

import type { Component } from "solid-js";
import {createEffect, createSignal, onCleanup, onMount, Show} from "solid-js";
import type { Socket } from "socket.io-client";
import { Icons } from '../assets/Icons';
import styles from './Canvas.module.css';
import ChooseWordOverlay from "./ChooseWordOverlay";
import GameEndOverlay from "./GameEndOverlay";
import Hint from './Hint';
import { game } from '../stores/game.store';
import {room} from "../stores/room.store";
import {
  hexToRgb,
  colorMatch,
  getColorAtPos,
  setColorAtPos,
  outOfBounds
} from './Canvas.utils';

type Pos = {
  x: number
  y: number
}

export type RGB = {
  r: number
  g: number
  b: number
  a: number
}

const Canvas: Component<{
  socket: Socket,
}> = (props) => {
  const [paintTool, setPaintTool] = createSignal<"brush" | "bucket">("brush");
	const [drawColor, setDrawColor] = createSignal<string>("#000000");
	const [brushSize, setBrushSize] = createSignal<number>(5);
	const [pos, setPos] = createSignal<{ x: number, y: number}>({x:0,y:0});
  const [isDrawer, setIsDrawer] = createSignal(props.socket.id === room.drawer.socketId);
  let rect: any;
	let canvas: any;
	let ctx: any;
	let lastX: number;
	let lastY: number;
  let imageData: ImageData;

  createEffect(() => {
    setIsDrawer(props.socket.id === room.drawer.socketId);
  });

	onMount(() => {
    ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseEnter', handlePos);
  });

	onCleanup(() => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mousedown', handleMouseDown);
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('mouseEnter', handlePos);
  });

  const handleMouseMove = (e: any) => {
    if (isDrawer()) draw(e);
  }

  const handleMouseDown = (e: any) => {
    if (isDrawer()) {
      handlePos(e);
      bucket(e);
    }
  }

  const handleMouseUp = () => {
    if (isDrawer()) clearPos();
  }

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
      x: Math.floor((e.clientX - rect.left) / (rect.right - rect.left) * canvas.width),
      y: Math.floor((e.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height)
    }); 
	};

	const draw = (e: any) => {
		if (e.buttons !== 1
          || paintTool() === "bucket"
          || outOfBounds(canvas, pos().x, pos().y)
          || !room.roundStarted
        ) return;

		ctx.beginPath();

		ctx.lineWidth = brushSize();
		ctx.lineCap = 'round';
		ctx.strokeStyle = drawColor();

		ctx.moveTo(pos().x, pos().y);
		handlePos(e);
		ctx.lineTo(pos().x, pos().y);

		ctx.stroke();

		props.socket.emit('canvas_emit', {
      type: "draw",
      x: pos().x,
      y: pos().y,
      color: drawColor(),
      brushSize: brushSize(),
      drawerId: props.socket.id,
      roomId: room.id
    });
	};

  const floodFill = (stack: Pos[], clickedColor: RGB, bucketColor: RGB) => {
    let pixel: Pos;
    if (!imageData) imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    //TODO: Fix endless loop that crashes client if bucket tool used quickly/unknown reasons
    while (stack.length) {
      pixel = stack.pop()!;
      let continueDown = true;
      let continueUp = true;
      let continueLeft = false;
      let continueRight = false;
      console.log('in loop');

      while (continueUp && pixel.y > 0) {
        pixel.y--;
        continueUp = colorMatch(
          getColorAtPos(
            imageData,
            ctx,
            canvas,
            pixel.x,
            pixel.y
          ), clickedColor, 200);
      }

      while (continueDown && pixel.y < canvas.height  - 1) {
        setColorAtPos(imageData, ctx, canvas, bucketColor, pixel.x, pixel.y);

        if (
            pixel.x - 1 >= 0 
            && colorMatch(getColorAtPos(
              imageData,
              ctx,
              canvas,
              pixel.x - 1,
              pixel.y), clickedColor, 200)
        ) {
          if (!continueLeft) {
            continueLeft = true;
            stack.push({ x: pixel.x - 1, y: pixel.y });
          }
        } else {
          continueLeft = false;
        }

        if (
          pixel.x + 1 < canvas.width
          && colorMatch(getColorAtPos(
              imageData,
              ctx,
              canvas,
              pixel.x + 1,
              pixel.y), clickedColor, 200)
        ) {
          if (!continueRight) {
            stack.push({ x: pixel.x + 1, y: pixel.y });
            continueRight = true;
          }
        } else {
          continueRight = false;
        }

        pixel.y++
          continueDown = colorMatch(
            getColorAtPos(
              imageData,
              ctx,
              canvas,
              pixel.x,
              pixel.y
            ),
            clickedColor,
            200
          );
      }
    }  
    
    ctx.putImageData(imageData, 0, 0);
  }

  const bucket = (e: any) => {
    if (paintTool() !== "bucket") return;
    if (!imageData) imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    handlePos(e);

    const clickedColor = getColorAtPos(
      imageData,
      ctx,
      canvas,
      pos().x,
      pos().y
    );
    
    const bucketColor = hexToRgb(drawColor());
    const stack: Pos[] = [];

    if (
      colorMatch(clickedColor, bucketColor, 200)
      || outOfBounds(canvas, pos().x, pos().y)
    ) return;

    stack.push({ x: pos().x, y: pos().y });
    props.socket.emit('canvas_emit', {
        id: props.socket.id,
        type: "bucket",
        stack,
        clickedColor,
        bucketColor
    });

    floodFill(stack, clickedColor, bucketColor);
  }

	const clearPos = () => {
		setPos({ x: 0, y: 0 });
		props.socket.emit('clear_pos', room.id);
	}

	const emitDraw = (x: number, y: number, color: string, brushSize: number) => {
		ctx.lineWidth = brushSize;
		ctx.lineCap = 'round';
		ctx.strokeStyle = color;

		if (lastX && lastY) {
      ctx.beginPath(); // Begin a new path for each line segment
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.closePath(); // Close the path for the current line segment
		}

		lastX = x;
		lastY = y;
	}

	props.socket.on('canvas_emit', data => {
    if (data.id !== props.socket.id) {
      if (data.type === "draw") {
        emitDraw(data.x, data.y, data.color, data.brushSize);
      } else if (data.type === "bucket") {
        console.log('bucket received');
        floodFill(data.stack, data.clickedColor, data.bucketColor);
      }
    }
  });

	props.socket.on('clear_pos', () => {
    lastX = 0;
    lastY = 0;
  });

	props.socket.on('clear_canvas', () => {
    if (!isDrawer()) handleClear();
  });

	return (
		<div class={styles.canvasContainer}>
      <div class={styles.canvasWrapper}>
        <div class={styles.hintContainer}>
          <Hint socket={props.socket} />
        </div>
        <canvas ref={canvas} width="720" height="500"></canvas>
        <Show when={!game.selectedWord && game.drawWords.length > 0 && !game.isGameOver} keyed>
          <ChooseWordOverlay socket={props.socket} />
        </Show>
        <Show when={game.isGameOver} keyed>
          <GameEndOverlay socket={props.socket} />
        </Show>
        <Show when={game.selectedWord} keyed>
          <div class={styles.wordOverlay}>Your word: {game.selectedWord}</div>
        </Show>
      </div>
      {isDrawer() && (
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
            <input type="range" min="1" max="50" step="1" value={brushSize()} onInput={(e) => handleBrushSize(e)} />
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
              <div class={styles.colorSquare} style={{background: "#000"}} onClick={() => setDrawColor("#000")} />
              <div class={styles.colorSquare} style={{background: "#545454"}} onClick={() => setDrawColor("#545454")} />
              <div class={styles.colorSquare} style={{background: "#804000"}} onClick={() => setDrawColor("#804000")} />
              <div class={styles.colorSquare} style={{background: "#FE0000"}} onClick={() => setDrawColor("#FE0000")} />
              <div class={styles.colorSquare} style={{background: "#FE6A00"}} onClick={() => setDrawColor("#FE6A00")} />
              <div class={styles.colorSquare} style={{background: "#FFD800"}} onClick={() => setDrawColor("#FFD800")} />
              <div class={styles.colorSquare} style={{background: "#00FE20"}} onClick={() => setDrawColor("#00FE20")} />
              <div class={styles.colorSquare} style={{background: "#0094FE"}} onClick={() => setDrawColor("#0094FE")} />
              <div class={styles.colorSquare} style={{background: "#0026FF"}} onClick={() => setDrawColor("#0026FF")} />
              <div class={styles.colorSquare} style={{background: "#B100FE"}} onClick={() => setDrawColor("#B100FE")} />
            </div>
            <div class={styles.colorRow}>
              <div class={styles.colorSquare} style={{background: "#fff"}} onClick={() => setDrawColor("#fff")} />
              <div class={styles.colorSquare} style={{background: "#A8A8A8"}} onClick={() => setDrawColor("#A8A8A8")} />
              <div class={styles.colorSquare} style={{background: "#401F00"}} onClick={() => setDrawColor("#401F00")} />
              <div class={styles.colorSquare} style={{background: "#800001"}} onClick={() => setDrawColor("#800001")} />
              <div class={styles.colorSquare} style={{background: "#803400"}} onClick={() => setDrawColor("#803400")} />
              <div class={styles.colorSquare} style={{background: "#806B00"}} onClick={() => setDrawColor("#806B00")} />
              <div class={styles.colorSquare} style={{background: "#007F0E"}} onClick={() => setDrawColor("#007F0E")} />
              <div class={styles.colorSquare} style={{background: "#00497E"}} onClick={() => setDrawColor("#00497E")} />
              <div class={styles.colorSquare} style={{background: "#001280"}} onClick={() => setDrawColor("#001280")} />
              <div class={styles.colorSquare} style={{background: "#590080"}} onClick={() => setDrawColor("#590080")} />
            </div>
          </div>
          <img
            src={Icons.Eraser}
            height="36"
            width="36"
            style={{ cursor: "pointer" }}
            alt="Undo"
          />
          <img
            src={Icons.TrashCan}
            height="36"
            width="36"
            style={{ cursor: "pointer" }}
            onClick={() => {
              handleClear();
              props.socket.emit("clear_canvas", room.id);
            }}
            alt="Clear canvas"
          />
        </div>
      )}
		</div>
	);
}

export default Canvas;

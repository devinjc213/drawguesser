import type { Component } from "solid-js";
import {createSignal, onCleanup, onMount, Show} from "solid-js";
import type { Socket } from "socket.io-client";
import { Icons } from '../assets/Icons';
import styles from './Canvas.module.css';
import ChooseWordOverlay from "./ChooseWordOverlay";
import Hint from './Hint';

type Pos = {
  x: number
  y: number
}

type RGB = {
  r: number
  g: number
  b: number
  a: number
}

const Canvas: Component<{
  socket: Socket,
  room: string,
  isDrawer: boolean,
  selectedWord: string,
  isRoundStarted: boolean
}> = (props) => {
  const [paintTool, setPaintTool] = createSignal<"brush" | "bucket">("brush");
	const [drawColor, setDrawColor] = createSignal<string>("#000000");
	const [brushSize, setBrushSize] = createSignal<number>(5);
  const [drawWords, setDrawWords] = createSignal<string[]>([]);
	const [pos, setPos] = createSignal<{ x: number, y: number}>({x:0,y:0});
	let rect: any;
	let canvas: any;
	let ctx: any;
	let lastX: number;
	let lastY: number;
  let imageData: any;

	onMount(() => {
    ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    document.addEventListener('mousemove', draw);
    document.addEventListener('mousedown', handlePos);
    document.addEventListener('mousedown', bucket);
    document.addEventListener('mouseup', clearPos);
    document.addEventListener('mouseEnter', handlePos);
  });

	onCleanup(() => {
    document.removeEventListener('mousemove', draw);
    document.removeEventListener('mousedown', handlePos);
    document.removeEventListener('mousedown', bucket);
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
      x: Math.floor((e.clientX - rect.left) / (rect.right - rect.left) * canvas.width),
      y: Math.floor((e.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height)
    }); 
	};

  const outOfBounds = (x: number, y: number) => { 
    return ((x > canvas.width || x < 0) || (y > canvas.height || y < 0));
  }

	const draw = (e: any) => {
		if (e.buttons !== 1
          || paintTool() === "bucket"
          || outOfBounds(pos().x, pos().y)
          || !props.isDrawer
          || !props.isRoundStarted
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
      id: props.socket.id
    });
	};

  const hexToRgb = (hex: string) => {
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
      a: 255
    };
  }

  const colorMatch = (color1: RGB, color2: RGB, tolerance: number) => {
    return Math.abs(color1.r - color2.r) <= tolerance &&
      Math.abs(color1.g - color2.g) <= tolerance &&
      Math.abs(color1.b - color2.b) <= tolerance;
  }

  const getColorAtPos = (imageData: any, x: number, y: number) => {
    const {width, data} = imageData;

    return {
      r: data[4 * (width * y + x)],
      g: data[4 * (width * y + x) + 1],
      b: data[4 * (width * y + x) + 2],
      a: data[4 * (width * y + x) + 3]
    }
  }

  const setColorAtPos = (imageData: any, color: RGB, x: number, y: number) => {
    const {width, data} = imageData;

    data[4 * (width * y + x)] = color.r;
    data[4 * (width * y + x) + 1] = color.g;
    data[4 * (width * y + x) + 2] = color.b;
    data[4 * (width * y + x) + 3] = color.a;
  }

  const floodFill = (stack: Pos[], clickedColor: RGB, bucketColor: RGB) => {
    let pixel: Pos;
    //TODO: Figure out antialiasing issue
    while (stack.length) {
      pixel = stack.pop()!;
      let continueDown = true;
      let continueUp = true;
      let continueLeft = false;
      let continueRight = false;

      while (continueUp && pixel.y > 0) {
        pixel.y--;
        continueUp = colorMatch(getColorAtPos(imageData, pixel.x, pixel.y), clickedColor, 200);
      }

      while (continueDown && pixel.y < canvas.height  - 1) {
        setColorAtPos(imageData, bucketColor, pixel.x, pixel.y);

        if (pixel.x - 1 >= 0 && 
            colorMatch(getColorAtPos(imageData, pixel.x - 1, pixel.y), clickedColor, 200)) {
          if (!continueLeft) {
            continueLeft = true;
            stack.push({ x: pixel.x - 1, y: pixel.y });
          }
        } else {
          continueLeft = false;
        }

        if (pixel.x + 1 < canvas.width &&
            colorMatch(getColorAtPos(imageData, pixel.x + 1, pixel.y), clickedColor, 200)) {
          if (!continueRight) {
            stack.push({ x: pixel.x + 1, y: pixel.y });
            continueRight = true;
          }
        } else {
          continueRight = false;
        }

        pixel.y++
          continueDown = colorMatch(getColorAtPos(imageData, pixel.x, pixel.y), clickedColor, 200);
      }
    }  
    
    ctx.putImageData(imageData, 0, 0);
  }

  const bucket = (e: any) => {
    if (paintTool() !== "bucket" || !props.isDrawer) return;
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    handlePos(e);
    const clickedColor = getColorAtPos(imageData, pos().x, pos().y);
    const bucketColor = hexToRgb(drawColor());
    const stack: Pos[] = [];

    if (colorMatch(clickedColor, bucketColor) || outOfBounds(pos().x, pos().y)) return;

    stack.push({ x: pos().x, y: pos().y });
    props.socket.emit('canvas_emit', {
        type: "bucket",
        stack,
        clickedColor,
        bucketColor
    });

    floodFill(stack, clickedColor, bucketColor);
  }
  

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
    if (data.id !== props.socket.id) {
      if (data.type === "draw")
        //need to refactor to have 1 draw function per tool
        emitDraw(data.x, data.y, data.color, data.brushSize);
      else if (data.type === "bucket") {
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        floodFill(data.stack, data.clickedColor, data.bucketColor);
      }
    }
  });

	props.socket.on('clear_pos', () => {
    lastX = 0;
    lastY = 0;
  });

	props.socket.on('clear_canvas', () => {
    handleClear();
  });

  props.socket.on('draw_words', words => {
    setDrawWords(words);
  });

  props.socket.on('round_end', () => {
    setDrawWords([]);
  })

	return (
		<div class={styles.canvasContainer}>
      <div class={styles.canvasWrapper}>
        <div class={styles.hintContainer}>
          <Hint socket={props.socket} />
        </div>
        <canvas ref={canvas} width="720" height="500"></canvas>
        <Show when={!props.selectedWord && drawWords().length > 0}>
          <ChooseWordOverlay socket={props.socket} room={props.room} words={drawWords()} />
        </Show>
        <Show when={props.selectedWord}>
          <div class={styles.wordOverlay}>Your word: {props.selectedWord}</div>
        </Show>
      </div>
      <Show when={props.isDrawer}>
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
      </Show>
		</div>
	);
}

export default Canvas;

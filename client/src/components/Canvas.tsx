import type { Component } from "solid-js";
import {createSignal, onCleanup, onMount} from "solid-js";
import type { Socket } from "socket.io-client";

const Canvas: Component<{ socket: Socket}> = (props) => {
    const [drawColor, setDrawColor] = createSignal<string>("#aaaaaa");
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

    const handlePos = (e: any) => {
        rect = canvas.getBoundingClientRect();

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

        props.socket.emit('canvas_emit', { x: pos().x, y: pos().y, color: drawColor(), id: props.socket.id });
    };

    const clearPos = () => {
        setPos({ x: 0, y: 0 });
        props.socket.emit('clear_pos', true);
    }
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

    props.socket.on('canvas_emit', data => {
        if (data.id !== props.socket.id) emitDraw(data.x, data.y);
    });

    props.socket.on('clear_pos', clearPos => {
        lastX = 0;
        lastY = 0;
    });

    return (
        <canvas ref={canvas} width="750" height="500"></canvas>
    );
}

export default Canvas;

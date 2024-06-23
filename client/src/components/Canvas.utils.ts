import { RGB } from './Canvas';

export function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
    a: 255
  };
}

export function colorMatch(color1: RGB, color2: RGB, tolerance: number) {
  return Math.abs(color1.r - color2.r) <= tolerance &&
    Math.abs(color1.g - color2.g) <= tolerance &&
    Math.abs(color1.b - color2.b) <= tolerance;
}

export function getColorAtPos(
  imageData: ImageData,
  ctx: any,
  canvas: any,
  x: number,
  y: number
) {
  if (!imageData) imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const {width, data} = imageData;

  return {
    r: data[4 * (width * y + x)],
    g: data[4 * (width * y + x) + 1],
    b: data[4 * (width * y + x) + 2],
    a: data[4 * (width * y + x) + 3]
  }
}


export function setColorAtPos(
  imageData: ImageData,
  ctx: any,
  canvas: any,
  color: RGB,
  x: number,
  y: number
) {
  if (!imageData) imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const {width, data} = imageData;

  data[4 * (width * y + x)] = color.r;
  data[4 * (width * y + x) + 1] = color.g;
  data[4 * (width * y + x) + 2] = color.b;
  data[4 * (width * y + x) + 3] = color.a;
}

export function outOfBounds(canvas: any, x: number, y: number) { 
  return ((x > canvas.width || x < 0) || (y > canvas.height || y < 0));
}

export type ClearBoard = {
  roomId: string
}

export type CanvasEmit = {
  roomId: string
  drawerId: string
  type: 'draw' | 'bucket'
  x?: number
  y?: number
  color?: string
  brushSize?: number
  stack?: number[][]
  clickedColor?: string
  bucketColor?: string
}


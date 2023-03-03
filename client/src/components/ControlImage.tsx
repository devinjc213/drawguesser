import type { Component } from "solid-js";

const ControlImage: Component<{
  src: string,
  height: string,
  width: string,
  alt: string
}> = (props) => {
  return <img src={props.src} height={props.height} width={props.width} alt={props.alt} />
}

export default ControlImage;

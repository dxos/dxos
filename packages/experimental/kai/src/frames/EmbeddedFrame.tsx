import React from "react"
import { Frame } from "@dxos/framebox"
import frameSrc from "./frame.html?raw"
import mainUrl from "./frame-main?url"

export type EmbeddedFrameProps = {
  frame: Frame
}

export const EmbeddedFrame = ({ frame }: EmbeddedFrameProps) => {

  const code = frame.compiled?.bundle;

  const html = frameSrc
    .replace('${importMap}', JSON.stringify({
      imports: {
        '@frame/main': mainUrl,
      }
    }))

  return (
    <iframe srcDoc={html} />
  )
}
//
// Copyright 2025 DXOS.org
//

declare module '*.mp4?raw' {
  const content: string;
  export default content;
}

// lib.dom omits `captureStream`: it is still a Media Capture from DOM Elements draft, though Chromium and Firefox ship it.
interface HTMLMediaElement {
  captureStream(): MediaStream;
}

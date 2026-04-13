//
// Copyright 2022 DXOS.org
//

// Vite resolves audio imports to asset URLs at build/serve time.
declare module '*.mp3' {
  const src: string;
  export default src;
}

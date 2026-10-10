//
// Copyright 2026 DXOS.org
//

// Remotion's bundler resolves an imported font file to its served URL.
declare module '*.woff2' {
  const url: string;
  export default url;
}

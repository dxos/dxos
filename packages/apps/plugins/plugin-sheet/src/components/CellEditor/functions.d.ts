//
// Copyright 2024 DXOS.org
//

declare module './functions.json' {
  const functions: Record<string, { function: string; description: string; syntax: string }[]>;
  export default functions;
}

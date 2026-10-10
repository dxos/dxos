//
// Copyright 2026 DXOS.org
//

// Bun is absent from the Node typings; presence of the global is how the runtime is detected.
declare global {
  // eslint-disable-next-line no-var
  var Bun: unknown | undefined;
}

export {};

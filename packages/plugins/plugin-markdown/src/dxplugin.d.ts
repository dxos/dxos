//
// Copyright 2026 DXOS.org
//

/**
 * Types the descriptor import. Declared per package because tsc loads an ambient declaration only
 * from a file in the program, which a dependency's shipped `.d.ts` is not.
 */
declare module '*/dxplugin.jsonc' {
  const descriptor: import('@dxos/protocols').Config2.Descriptor;
  export default descriptor;
}

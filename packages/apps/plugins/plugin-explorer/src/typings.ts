//
// Copyright 2022 DXOS.org
//

// TODO(burdon): Cannot patch top-level definitions.
// https://www.typescriptlang.org/docs/handbook/release-notes/typescript-1-8.html#augmenting-globalmodule-scope-from-modules
// Out of date: https://github.com/observablehq/plot/issues/1905

declare module '@types/d3-time' {
  export const unixDay: any;
}

//
// Copyright 2025 DXOS.org
//

// TODO(thure): I was unable to bring this in from `ui-types` because toolbox.ts would not acknowledge
//  `"@dxos/lit-ui": [ "packages/ui/lit-ui/src/index.ts" ]` in tsconfig.paths.json. How is this meant to work? How is it
//  okay with `react-hooks`?
export type Size =
  | 0
  | 'px'
  | 0.5
  | 1
  | 1.5
  | 2
  | 2.5
  | 3
  | 3.5
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 14
  | 16
  | 20
  | 24
  | 28
  | 32
  | 36
  | 40
  | 44
  | 48
  | 52
  | 56
  | 60
  | 64
  | 72
  | 80
  | 96;

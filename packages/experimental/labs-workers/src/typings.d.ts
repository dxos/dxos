//
// Copyright 2022 DXOS.org
//

declare module 'js-chess-engine' {
  // https://www.npmjs.com/package/js-chess-engine#computer-ai
  export class Game {
    constructor(state?: string);
    aiMove(level?: number): void;
    exportFEN(): string;
  }
}

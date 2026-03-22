//
// Copyright 2026 DXOS.org
//

import { type Locator } from '@playwright/test';

export class BoardManager {
  constructor(private readonly root: Locator) {}

  board() {
    return this.root.locator('[data-testid="tictactoe-board"]');
  }

  cell(index: number) {
    return this.root.locator(`[data-testid="tictactoe-cell-${index}"]`);
  }

  status() {
    return this.root.locator('[data-testid="tictactoe-status"]');
  }

  newGameButton() {
    return this.root.locator('[data-testid="tictactoe-new-game"]');
  }

  async waitUntilReady() {
    await this.board().waitFor({ state: 'visible' });
  }

  /** Plays a sequence of moves by clicking cells in order. */
  async playMoves(cells: number[]) {
    for (const cell of cells) {
      await this.cell(cell).click();
    }
  }
}

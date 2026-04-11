//
// Copyright 2026 DXOS.org
//

import { type Page, expect, test } from '@playwright/test';

import { setupPage, storybookUrl } from '@dxos/test-utils/playwright';

import { BoardManager } from './board-manager';

const PORT = 9012;
const STORY_URL = storybookUrl('plugins-plugin-tictactoe-containers-tictactoearticle--default', PORT);

test.describe('TicTacToe', () => {
  let page: Page;
  let board: BoardManager;

  test.beforeEach(async ({ browser }) => {
    ({ page } = await setupPage(browser, { url: STORY_URL, viewportSize: { width: 1280, height: 800 } }));
    board = new BoardManager(page.locator('body'));
    await board.waitUntilReady();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('renders empty board', async () => {
    for (let index = 0; index < 9; index++) {
      await expect(board.cell(index)).toBeVisible();
      await expect(board.cell(index)).toHaveText('');
    }
  });

  test('make a move - X appears', async () => {
    await board.cell(4).click();
    await expect(board.cell(4)).toHaveText('X');
  });

  test('win - X wins top row', async () => {
    // X: 0,1,2  O: 3,4
    await board.playMoves([0, 3, 1, 4, 2]);
    await expect(board.status()).toHaveText('X wins!');
  });

  test('draw - full board no winner', async () => {
    // X O X / X X O / O X O
    await board.playMoves([0, 1, 2, 5, 3, 6, 4, 8, 7]);
    await expect(board.status()).toHaveText("It's a draw!");
  });

  test('invalid move - clicking occupied cell does nothing', async () => {
    await board.cell(4).click();
    await expect(board.cell(4)).toHaveText('X');
    await board.cell(4).click();
    await expect(board.cell(4)).toHaveText('X');
  });

  test('new game - resets board', async () => {
    await board.playMoves([0, 3, 1, 4, 2]);
    await expect(board.status()).toHaveText('X wins!');
    await board.newGameButton().click();
    for (let index = 0; index < 9; index++) {
      await expect(board.cell(index)).toHaveText('');
    }
  });
});

//
// Copyright 2025 DXOS.org
//

/**
 * Playwright-only entry point for e2e helpers (e.g. BoardManager).
 * Kept separate from the ./testing entry point so that Node can load this
 * without pulling in the testing bundle and its browser-only dependencies
 * (e.g. @atlaskit/pragmatic-drag-and-drop). Use ./playwright from Playwright
 * specs; use ./testing for in-browser test helpers.
 */

export * from './board-manager';

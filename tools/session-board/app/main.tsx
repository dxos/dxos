//
// Copyright 2026 DXOS.org
//

import '@dxos-theme';

import React from 'react';
import { createRoot } from 'react-dom/client';
import sprite from 'virtual:session-board-icons';

import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { translations as taskTranslations } from '@dxos/react-ui-task/translations';
import '@dxos/react-ui/theme.css';
import * as Theme from '@dxos/react-ui/Theme';

import { Board } from '../src/Board.tsx';
import { type BoardData } from '../src/types.ts';
import { useLandActions } from './actions.ts';

// The icon registry loads its sprite from `/icons.svg` at the site root, which an Artifact does not have; the page
// carries the icons it uses and answers that one request itself.
const fetchNetwork = globalThis.fetch.bind(globalThis);
globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) =>
  String(input) === '/icons.svg'
    ? Promise.resolve(new Response(sprite, { headers: { 'content-type': 'image/svg+xml' } }))
    : fetchNetwork(input, init);

/** The board `cli.ts build` wrote into the page; the unfilled template has none (the story shows the sample). */
const readBoard = (): BoardData | undefined => {
  const text = document.getElementById('board-data')?.textContent?.trim() ?? '';
  if (text.startsWith('{{') || !text) {
    return undefined;
  }
  // Written by cli.ts from the same types after it validated the source, so it is not validated again here.
  const board: BoardData = JSON.parse(text);
  return board;
};

// Dark always: the board is a status display, and one palette keeps its hues readable on any host.
document.documentElement.classList.add('dark');

const translations = [...taskTranslations, ...formTranslations];

const App = ({ board }: { board: BoardData }) => {
  const { landing, onLandChange } = useLandActions();
  return (
    <Theme.Provider tx={Theme.defaultTx} themeMode='dark' resourceExtensions={translations}>
      <Board board={board} landing={landing} onLandChange={onLandChange} />
    </Theme.Provider>
  );
};

const board = readBoard();
const root = document.getElementById('root');
if (root && board) {
  document.title = board.title;
  createRoot(root).render(<App board={board} />);
}

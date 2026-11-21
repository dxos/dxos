//
// Copyright 2026 DXOS.org
//

import '@dxos-theme';

import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import sprite from 'virtual:session-board-icons';

import '@dxos/react-ui/theme.css';
import * as Theme from '@dxos/react-ui/Theme';

import { Board } from '../src/Board.tsx';
import { sampleBoard } from '../src/testing/sample.ts';
import { type BoardData } from '../src/types.ts';

// The icon registry loads its sprite from `/icons.svg` at the site root, which an Artifact does not have; the page
// carries the icons it uses and answers that one request itself.
const fetchNetwork = globalThis.fetch.bind(globalThis);
globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) =>
  String(input) === '/icons.svg'
    ? Promise.resolve(new Response(sprite, { headers: { 'content-type': 'image/svg+xml' } }))
    : fetchNetwork(input, init);

/** The board `cli.ts build` wrote into the page, or the sample while developing the page. */
const readBoard = (): BoardData => {
  const text = document.getElementById('board-data')?.textContent?.trim() ?? '';
  if (text.startsWith('{{') || !text) {
    return sampleBoard();
  }
  // Written by cli.ts from the same types after it validated the source, so it is not validated again here.
  const board: BoardData = JSON.parse(text);
  return board;
};

/** Dark unless the viewer chose light: the OS setting, overridden by a host's `data-theme` (Claude Artifacts set one). */
const isDark = () => {
  const chosen = document.documentElement.dataset.theme;
  return chosen ? chosen === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const useThemeMode = () => {
  const [dark, setDark] = useState(isDark);
  useEffect(() => {
    const update = () => {
      document.documentElement.classList.toggle('dark', isDark());
      setDark(isDark());
    };
    update();
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    query.addEventListener('change', update);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      query.removeEventListener('change', update);
      observer.disconnect();
    };
  }, []);
  return dark ? 'dark' : 'light';
};

const App = ({ board }: { board: BoardData }) => {
  const themeMode = useThemeMode();
  return (
    <Theme.Provider tx={Theme.defaultTx} themeMode={themeMode}>
      <Board board={board} />
    </Theme.Provider>
  );
};

const board = readBoard();
const root = document.getElementById('root');
if (root) {
  document.title = board.title;
  createRoot(root).render(<App board={board} />);
}

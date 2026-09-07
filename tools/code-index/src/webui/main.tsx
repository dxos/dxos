/** @jsxImportSource solid-js */
//
// Copyright 2026 DXOS.org
//

import '@dxos-theme';

import { render } from 'solid-js/web';

import { App } from './App.tsx';

/**
 * The web UI's entry point. Solid owns the page; the chat thread inside it is React, mounted as an
 * island (see `react/Island.ts`) so the repository's own `@dxos/react-ui-assistant` can be used
 * unmodified rather than reimplemented in Solid.
 */

const root = document.getElementById('root');
if (!root) {
  throw new Error('Missing #root');
}

render(() => <App />, root);

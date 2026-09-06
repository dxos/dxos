/** @jsxImportSource solid-js */
//
// Copyright 2026 DXOS.org
//

import '@dxos-theme';

import { render } from 'solid-js/web';

import { App } from './App.tsx';
import { initAutomergeWasm } from './automerge.ts';

/**
 * The web UI's entry point. Solid owns the page; the chat thread inside it is React, mounted as an
 * island (see `react/Island.ts`) so the repository's own `@dxos/react-ui-thread` can be used
 * unmodified rather than reimplemented in Solid.
 */

const root = document.getElementById('root');
if (!root) {
  throw new Error('Missing #root');
}

// The thread's messages are ECHO objects, so automerge's wasm has to be live before the first
// render rather than lazily on the first message.
void initAutomergeWasm().then(() => render(() => <App />, root));

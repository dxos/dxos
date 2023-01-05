//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';

// TODO(burdon): Next
//  - API: space.experimental.db
//  - View selector
//  - Sortable task list w/ OrderedSet
//  - Soft delete (skip filter)

// TODO(burdon): Responsive Masonry (web/desktop/mobile). Multiple browsers.
// TODO(burdon): Materialized links (referential integrity).
// TODO(burdon): Cards (see kitchen sink).
// TODO(burdon): Virtual table.
//  - https://react-table-v7.tanstack.com
//  - nhttps://bvaughn.github.io/react-virtualized/#/components/Masonry
// TODO(burdon): PWA/Electron.
// TODO(burdon): Super app (WeChat/Twitter) for IPFS: https://youtu.be/zRcl77pnbgY?t=1835 (Scott Galloway)

import './style.css';

(() => {
  // TODO(burdon): Get debug from config.
  createRoot(document.getElementById('root')!).render(<App debug={false} />);
})();

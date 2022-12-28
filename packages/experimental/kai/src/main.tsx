//
// Copyright 2020 DXOS.org
//

// TODO(burdon): Sharing/Routes.
// TODO(burdon): Responsive Masonry (web/desktop/mobile). Multiple browsers.

// TODO(burdon): Editable task list.
// TODO(burdon): Cards (see kitchen sink).
//  - https://cruip.com/demos/mosaic/?ref=highscore
// TODO(burdon): Virtual table.
// TODO(burdon): Electron app.

// TODO(burdon): Super app (Wechat/Twitter) for IPFS: https://youtu.be/zRcl77pnbgY?t=1835 (Scott Galloway)

import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './containers';

// TODO(burdon): Config.
// https://github.com/dxos/dxos/tree/main/packages/common/react-ui#2-reference-the-basic-stylesheet
// import '@dxosTheme';
import './style.css';

(() => {
  createRoot(document.getElementById('root')!).render(<App debug={true} />);
})();

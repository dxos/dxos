//
// Copyright 2022 DXOS.org
//

import React from 'react';
import ReactDOM from 'react-dom/client';
import 'tw-elements';
import 'virtual:fonts.css';

import Index from './slides/index.mdx';

// TODO(burdon): Image layout plugin (sizing, position, bleed options).
// TODO(burdon): Router for pager (change URL).
// TODO(burdon): Form-factor (e.g., 16x9) with max dimensions.
//  - https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag
//  - Google slides creates an SVG.
// TODO(burdon): Storybook/live components (task list, chess, kitchen sink).

import './style.css';

const start = async () => {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <Index />
    </React.StrictMode>
  );
};

void start();

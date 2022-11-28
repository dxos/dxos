//
// Copyright 2022 DXOS.org
//

import React from 'react';
import ReactDOM from 'react-dom/client';
import 'tw-elements';
import 'virtual:fonts.css';

import Index from './slides/index.mdx';

// TODO(burdon): Image layout plugin (sizing, position, bleed options).
// TODO(burdon): Create Library with light-weight projects using template.
// TODO(burdon): Router for pager (change URL).
// TODO(burdon): Form-factor (e.g., 16x9) with max dimensions.
//  - https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag
//  - Google slides creates an SVG.
// TODO(burdon): Storybook/live components (task list, chess, kitchen sink, kube, fish).

// TODO(burdon): Templates:
//  - https://elements.envato.com/presentation-templates
//  - https://elements.envato.com/marlin-startup-powerpoint-presentation-6CTSWB/preview/2
// TODO(burdon): Elements (layouts and components):
//  - https://tailwind-elements.com
//    - https://tailwind-elements.com/docs/standard/designblocks/cta/
//  - https://flowbite.com/#components

import './style.css';

const start = async () => {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <Index />
    </React.StrictMode>
  );
};

void start();

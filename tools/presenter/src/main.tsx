//
// Copyright 2022 DXOS.org
//

import React from 'react';
import ReactDOM from 'react-dom/client';

// https://www.npmjs.com/package/vite-plugin-fonts
import 'virtual:fonts.css';

import Index from './slides/index.mdx';
import './style.css';

// TODO(burdon): Image layout plugin (sizing, position, bleed options).
// TODO(burdon): Index page with frontmatter names.
// TODO(burdon): Vite/tailwind Library with light-weight projects using template.
// TODO(burdon): Storybook/live components (task list, chess, kitchen sink, kube, fish).
// TODO(burdon): Create bundle; upload to KUBE/IPFS.

// TODO(burdon): Templates:
//  - https://elements.envato.com/presentation-templates
//  - https://elements.envato.com/marlin-startup-powerpoint-presentation-6CTSWB/preview/2

// TODO(burdon): Eleme  nts (layouts and components):
//  - https://flowbite.com/#components
//  - https://tailwind-elements.com
//    - https://tailwind-elements.com/docs/standard/designblocks/cta

// TODO(burdon): Phase 2
//  - Create PDF.
//    https://github.com/diegomura/react-pdf
//  - Presenter notes (iframe popup).
//  - Timer.
//  - Builds.

const start = async () => {
  // TODO(burdon): Adding title causes header to be shown on each page.
  // import * as IndexProps from './slides/index.mdx';
  // https://mdxjs.com/guides/frontmatter
  // const { title } = IndexProps;
  // console.log('Presentation:', title);

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <Index />
    </React.StrictMode>
  );
};

void start();

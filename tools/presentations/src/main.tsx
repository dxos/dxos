//
// Copyright 2022 DXOS.org
//

import * as components from '@mdxp/components';
import Deck, { Zoom } from '@mdxp/core';
import React from 'react';
import ReactDOM from 'react-dom/client';

// import './index.css';
import MDXPresentation from './slides/main.mdx';
import theme from './theme';

// https://0phoff.github.io/MDXP
// https://scottspence.com/posts/making-mdx-presentations#mdxp

const Index = () => {
  return (
    <Zoom maxWidth={1000} width={1000} aspectRatio={16 / 9} sx={{ maxWidth: '100vw', maxHeight: '100vh' }}>
      <Deck components={{ ...components }} theme={theme}>
        <MDXPresentation />
      </Deck>
    </Zoom>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Index />
  </React.StrictMode>
);

//
// Copyright 2022 DXOS.org
//

import React from 'react';
import ReactDOM from 'react-dom/client';

import Logo from '@dxos/assets/assets/icons/dark/icon-dxos.svg';

import MDXPresentation from './slides/main.mdx';

// https://0phoff.github.io/MDXP
// https://scottspence.com/posts/making-mdx-presentations#mdxp

const Index = () => {
  return (
    <div>
      <img width={100} src={Logo} />
      <MDXPresentation />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Index />
  </React.StrictMode>
);

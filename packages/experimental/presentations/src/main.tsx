//
// Copyright 2022 DXOS.org
//

import React from 'react';
import ReactDOM from 'react-dom/client';

import MDXPresentation from './slides/main.mdx';

const Index = () => {
  return (
    <div>
      <MDXPresentation />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Index />
  </React.StrictMode>
);

//
// Copyright 2022 DXOS.org
//

// eslint-disable-next-line
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';

document.addEventListener('DOMContentLoaded', () => {
  const root = createRoot(document.getElementById('root')!);
  root.render(createElement(App, {}));
});

//
// Copyright 2022 DXOS.org
//

import { createElement } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';

document.addEventListener('DOMContentLoaded', () => {
  const root = createRoot(document.getElementById('root')!);
  root.render(createElement(App, {}));
});

//
// Copyright 2026 DXOS.org
//

// The theme's tokens and utilities, which `ThemePlugin` generates.
import '@dxos-theme';

import React from 'react';
import { createRoot } from 'react-dom/client';

// The components' own rules, which ship apart from the theme.
import '@dxos/react-ui/theme.css';
import * as Button from '@dxos/react-ui/Button';
import * as Theme from '@dxos/react-ui/Theme';
import { translations } from '@dxos/react-ui/translations';

// #region provider
const App = () => (
  <Theme.Provider tx={Theme.defaultTx} resourceExtensions={translations}>
    <Button.Root variant='primary'>Hello, TILE</Button.Root>
  </Theme.Provider>
);

createRoot(document.getElementById('root')!).render(<App />);
// #endregion

// #region dark
// react-ui's dark styles apply under a `dark` class on the root element.
const media = window.matchMedia('(prefers-color-scheme: dark)');
const sync = () =>
  document.documentElement.classList.toggle('dark', media.matches);
sync();
media.addEventListener('change', sync);
// #endregion

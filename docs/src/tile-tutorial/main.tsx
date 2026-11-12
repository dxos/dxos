//
// Copyright 2026 DXOS.org
//

import '@dxos-theme';

import React from 'react';
import { createRoot } from 'react-dom/client';

import '@dxos/react-ui/theme.css';
import * as Theme from '@dxos/react-ui/Theme';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { ContactsScreen } from './icons/ContactsScreen.tsx';
import { translations } from './icons/translations.ts';

// #region provider
createRoot(document.getElementById('root')!).render(
  <Theme.Provider tx={Theme.defaultTx} resourceExtensions={[...uiTranslations, ...translations]}>
    <ContactsScreen />
  </Theme.Provider>,
);
// #endregion

//
// Copyright 2026 DXOS.org
//

import '@dxos-theme';

import React from 'react';
import { createRoot } from 'react-dom/client';

import { type Client } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';
import '@dxos/react-ui/theme.css';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import * as Theme from '@dxos/react-ui/Theme';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { translations } from '../icons/translations.ts';
import { ContactsScreen } from './ContactsScreen.tsx';
import { Organization, Person } from './schema.ts';

// #region space
/** Gives the app an identity the first time it runs, and a space to keep the contacts in. */
const setUp = async (client: Client) => {
  if (!client.halo.identity.get()) {
    await client.halo.createIdentity();
  }
  if (client.spaces.get().length === 0) {
    await client.spaces.create({ name: 'Contacts' });
  }
};

/** Shows the screen once the space is there. */
const Contacts = () => {
  const [space] = useSpaces();
  return space ? <ContactsScreen db={space.db} /> : null;
};
// #endregion

// #region provider
createRoot(document.getElementById('root')!).render(
  <ClientProvider types={[Organization, Person]} onInitialized={setUp}>
    <Theme.Provider tx={Theme.defaultTx} resourceExtensions={[...uiTranslations, ...formTranslations, ...translations]}>
      <Contacts />
    </Theme.Provider>
  </ClientProvider>,
);
// #endregion

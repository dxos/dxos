//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { HashRouter } from 'react-router-dom';

import { ClientProvider } from '@dxos/react-client';
import { ProfileInitializer } from '@dxos/react-client-testing';

import { AppLayout } from './AppLayout.js';

export default {
  title: 'react-appkit/AppLayout'
};

// TODO(wittjosiah): Support multiple story files in one component directory.
// TODO(wittjosiah): Support testing react router componets in stories.
export const Primary = () => {
  return (
    <HashRouter>
      <ClientProvider>
        <ProfileInitializer>
          <AppLayout />
        </ProfileInitializer>
      </ClientProvider>
    </HashRouter>
  );
};

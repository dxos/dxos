//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { ClientProvider, ProfileInitializer } from '@dxos/react-client';

import { App } from '../src';
import { ONLINE_CONFIG } from './config';

export default {
  title: 'HelloWorld/App'
};

/**
 * Single-player App story.
 */
export const Primary = () => {
  return (
    <ClientProvider config={ONLINE_CONFIG}>
      <ProfileInitializer>
        <App />
      </ProfileInitializer>
    </ClientProvider>
  );
};

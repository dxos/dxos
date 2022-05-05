//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { ClientProvider, ProfileInitializer } from '@dxos/react-client';

export default {
  title: 'Lexical/Editor'
};

export const Primary = () => {
  return (
    <ClientProvider>
      <ProfileInitializer>
        <div>Test</div>
      </ProfileInitializer>
    </ClientProvider>
  );
};

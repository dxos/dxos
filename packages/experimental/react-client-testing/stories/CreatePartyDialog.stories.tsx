//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { FullScreen } from '@dxos/react-components';

import { CreatePartyDialog } from '../src';

export default {
  title: 'react-client-testing/CreatePartyDialog'
};

export const Primary = () => (
  <FullScreen>
    <CreatePartyDialog
      open
      onCreate={() => console.log('Create party')}
      onJoin={(invitation: string) => console.log('Join party: ' + invitation)}
      onImport={() => console.log('Import Party')}
    />
  </FullScreen>
);

//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { FullScreen } from '@dxos/react-components';

import { CreateSpaceDialog } from '../src';

export default {
  title: 'react-client-testing/CreateSpaceDialog'
};

export const Primary = () => (
  <FullScreen>
    <CreateSpaceDialog
      open
      onCreate={() => console.log('Create space')}
      onJoin={(invitation: string) => console.log('Join space: ' + invitation)}
      onImport={() => console.log('Import Space')}
    />
  </FullScreen>
);

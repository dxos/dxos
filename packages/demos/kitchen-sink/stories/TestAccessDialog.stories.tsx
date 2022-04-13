//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React from 'react';

import { ClientProvider, ProfileInitializer } from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components';

import { InvitationDialog } from './helpers';

export default {
  title: 'KitchenSink/TestInvitationDialog'
};

faker.seed(100);

const App = () => {
  return (
    <FullScreen>
      <InvitationDialog
        open
        title='Kitchen Sink'
        onCreate={() => console.log('Create party')}
        onJoin={(invitationCode: string) => console.log('Join party: ' + invitationCode)}
        onImport={() => console.log('Import Party')}
      />
    </FullScreen>
  );
};

export const Primary = () => {
  return (
    <ClientProvider>
      <ProfileInitializer>
        <App />
      </ProfileInitializer>
    </ClientProvider>
  );
};

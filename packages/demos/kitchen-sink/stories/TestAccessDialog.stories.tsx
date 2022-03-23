//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React from 'react';

import { ClientProvider, ProfileInitializer } from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components';
import { TestInvitationDialog } from '@dxos/react-framework';

export default {
  title: 'KitchenSink/TestInvitationDialog'
};

faker.seed(100);

const App = () => {
  return (
    <FullScreen>
      <TestInvitationDialog
        open
        title='Kitchen Sink'
        onCreate={() => console.log('Party creation')}
        onJoin={(invitationCode: string) => ('Party joining')}
        onImport={() => console.log('Party importing')}
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

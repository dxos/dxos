//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Config, Defaults, Dynamics } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';
import { Loading, Main } from '@dxos/react-ui';
import { TextModel } from '@dxos/text-model';

import { Composer, ProviderFallback } from './components';
import { PartyProvider, ProfileProvider, TextItemProvider, useTextItem } from './context';

const configProvider = async () => new Config(await Dynamics(), Defaults());

// TODO(wittjosiah): This is a temporary wrapper to make Composer exportable.
//   We want to consider whether the Profile/Party/Item providers should be a part of the sdk.
const Demo = () => {
  const { item } = useTextItem();

  if (!item) {
    return <Loading label='Loading' />;
  }

  return <Composer item={item} />;
};

export const App = () => {
  return (
    <ClientProvider
      config={configProvider}
      fallback={<ProviderFallback message='Starting DXOS client…' />}
      onInitialize={async (client) => {
        client.echo.registerModel(TextModel);
      }}
    >
      <ProfileProvider>
        <PartyProvider>
          <TextItemProvider>
            <Main>
              <Demo />
            </Main>
          </TextItemProvider>
        </PartyProvider>
      </ProfileProvider>
    </ClientProvider>
  );
};

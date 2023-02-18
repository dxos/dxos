//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import { StoryFn } from '@storybook/react';
import React, { useMemo, useState } from 'react';

import { CancellableInvitationObservable, Client, Invitation } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { log } from '@dxos/log';
import { useAsyncEffect } from '@dxos/react-async';
import { ClientProvider } from '@dxos/react-client';
import { Loading, mx, ThemeContext } from '@dxos/react-components';

import { defaultSurface } from '../../styles';
import { InvitationList } from './InvitationList';

export default {
  component: InvitationList
};

export const Default = {
  decorators: [
    (Story: StoryFn) => {
      const testBuilder = new TestBuilder();
      const clients = useMemo(() => {
        return [...Array(1)].map(() => new Client({ services: testBuilder.createClientServicesHost() }));
      }, []);

      const [invitations, setInvitations] = useState<CancellableInvitationObservable[]>([]);

      useAsyncEffect(async () => {
        await Promise.all(clients.map((client) => client.initialize()));
        log.info('[initialized]');

        await clients[0].halo.createProfile({ displayName: 'Os Mutantes' });

        const space = await clients[0].echo.createSpace();
        log.info('[space created]', space);
        space.properties.name = 'Q3 2022 Planning';
        log.info('[space title set]', space?.properties.name);

        setInvitations([...Array(4)].map(() => space.createInvitation({ type: Invitation.Type.INTERACTIVE })));

        log.info('[invitations created]');

        return () => {
          void Promise.all(clients.map((client) => client.destroy()));
        };
      }, clients);

      return (
        <ClientProvider client={clients[0]} fallback={() => <Loading label='Loading client…' />}>
          <ThemeContext.Provider value={{ themeVariant: 'os' }}>
            <div className={mx(defaultSurface, 'max-is-xs mli-auto rounded-md p-2 backdrop-blur-md')}>
              <Story args={{ invitations, createInvitationUrl: (code: string) => code }} />
            </div>
          </ThemeContext.Provider>
        </ClientProvider>
      );
    }
  ]
};

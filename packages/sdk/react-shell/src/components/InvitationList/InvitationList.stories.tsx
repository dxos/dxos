//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import { StoryFn } from '@storybook/react';
import React, { useMemo, useState } from 'react';

import { ThemeContext, useThemeContext } from '@dxos/aurora';
import { mx, osTx } from '@dxos/aurora-theme';
import { log } from '@dxos/log';
import { Loading } from '@dxos/react-appkit';
import { useAsyncEffect } from '@dxos/react-async';
import { Client, ClientProvider } from '@dxos/react-client';
import { CancellableInvitationObservable, Invitation } from '@dxos/react-client/invitations';
import { TestBuilder } from '@dxos/react-client/testing';

import { defaultSurface } from '../../styles';
import { InvitationList } from './InvitationList';

export default {
  component: InvitationList,
};

export const Default = {
  decorators: [
    (Story: StoryFn) => {
      const testBuilder = new TestBuilder();
      const clients = useMemo(() => {
        return [...Array(1)].map(() => new Client({ services: testBuilder.createLocal() }));
      }, []);

      const [invitations, setInvitations] = useState<CancellableInvitationObservable[]>([]);

      const themeContext = useThemeContext();

      useAsyncEffect(async () => {
        await Promise.all(clients.map((client) => client.initialize()));
        log.info('[initialized]');

        await clients[0].halo.createIdentity({ displayName: 'Os Mutantes' });

        const space = await clients[0].createSpace();
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
          <ThemeContext.Provider value={{ ...themeContext, tx: osTx }}>
            <div className={mx(defaultSurface, 'max-is-xs mli-auto rounded-md p-2 backdrop-blur-md')}>
              <Story args={{ invitations, createInvitationUrl: (code: string) => code }} />
            </div>
          </ThemeContext.Provider>
        </ClientProvider>
      );
    },
  ],
};

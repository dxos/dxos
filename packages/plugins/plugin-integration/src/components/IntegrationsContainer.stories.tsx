//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { IntentPlugin } from '@dxos/app-framework/worker';
import { remoteServiceEndpoints } from '@dxos/artifact-testing';
import { ClientPlugin } from '@dxos/plugin-client';
import { faker } from '@dxos/random';
import { Config } from '@dxos/react-client';
import { makeRef, live, useSpace } from '@dxos/react-client/echo';
import { AccessTokenType } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { IntegrationsContainer } from './IntegrationsContainer';
import { TEST_INTEGRATIONS } from '../testing';
import translations from '../translations';
import { IntegrationType } from '../types';

const DefaultStory = () => {
  const space = useSpace();
  if (!space) {
    return <div>Loading...</div>;
  }

  return <IntegrationsContainer space={space} />;
};

const meta: Meta = {
  title: 'plugins/plugin-integration/IntegrationsContainer',
  component: IntegrationsContainer,
  render: DefaultStory,
  decorators: [
    withPluginManager({
      plugins: [
        ClientPlugin({
          config: new Config({
            runtime: {
              services: {
                edge: { url: remoteServiceEndpoints.edge },
              },
            },
          }),
          types: [IntegrationType, AccessTokenType],
          onClientInitialized: async (_, client) => {
            await client.halo.createIdentity();
            await client.spaces.waitUntilReady();
            await client.spaces.default.waitUntilReady();

            // TODO(wittjosiah): Setup fails with edge auth.
            TEST_INTEGRATIONS.slice(0, 2).forEach((integration) => {
              client.spaces.default.db.add(
                live(IntegrationType, {
                  serviceId: integration.serviceId,
                  accessToken: makeRef(
                    live(AccessTokenType, {
                      token: faker.string.uuid(),
                      source: integration.auth!.source,
                      note: integration.auth!.note,
                    }),
                  ),
                }),
              );
            });
          },
        }),
        IntentPlugin(),
      ],
    }),
    withLayout({ fullscreen: true, tooltips: true, classNames: 'flex justify-center' }),
    withTheme,
  ],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof IntegrationsContainer>;

export const Default: Story = {
  args: {},
};

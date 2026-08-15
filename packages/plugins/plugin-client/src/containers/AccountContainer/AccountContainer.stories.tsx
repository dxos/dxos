//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import { expect, waitFor, within } from 'storybook/test';

import { ProcessManagerPlugin } from '@dxos/app-framework';
import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import { HubHttpClient } from '@dxos/edge-client';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { ClientPlugin } from '#plugin';
import { initializeIdentity } from '#testing';
import { translations } from '#translations';
import { ClientCapabilities } from '#types';

import { AccountContainer } from './AccountContainer';

/**
 * A `HubHttpClient` whose account lookup is answered locally. Constructed for real and overridden
 * per method — a partial stand-in would need a cast, and `setIdentity` (called by the hook on every
 * identity change) has to keep working.
 */
const stubHubHttpClient = (account: { email: string; emailVerified: boolean }) => {
  const client = new HubHttpClient('https://hub.test');
  client.getAccount = async () => ({
    identityDid: 'did:key:test',
    email: account.email,
    emailVerified: account.emailVerified,
    createdAt: new Date(0).toISOString(),
    invitationsRemaining: 2,
  });
  return client;
};

const decorators = (hub?: HubHttpClient) => [
  withTheme(),
  withLayout({ layout: 'fullscreen' }),
  withPluginManager({
    plugins: [
      ClientPlugin({
        onClientInitialized: ({ client }) =>
          Effect.gen(function* () {
            yield* initializeIdentity(client);
          }),
      }),
      ProcessManagerPlugin(),
    ],
    capabilities: hub ? [Capability.contribute(ClientCapabilities.HubHttpClient, hub)] : [],
  }),
];

const meta = {
  title: 'plugins/plugin-client/containers/AccountContainer',
  component: AccountContainer,
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof AccountContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

/** No hub client configured, so the container reports that the identity has no edge access. */
export const Default: Story = {
  decorators: decorators(),
};

/** The signed-in branch, which is the only one that reaches the account-page section. */
export const WithAccount: Story = {
  decorators: decorators(stubHubHttpClient({ email: 'someone@example.com', emailVerified: true })),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(async () => expect(canvas.getByText('someone@example.com')).toBeInTheDocument(), { timeout: 20_000 });
    await expect(canvas.getByRole('button', { name: 'Open account page' })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Delete account' })).toBeInTheDocument();
  },
};

/** An unverified email offers the resend action instead of the verified check. */
export const UnverifiedEmail: Story = {
  decorators: decorators(stubHubHttpClient({ email: 'unverified@example.com', emailVerified: false })),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(
      async () => expect(canvas.getByRole('button', { name: 'Resend verification email' })).toBeInTheDocument(),
      {
        timeout: 20_000,
      },
    );
  },
};

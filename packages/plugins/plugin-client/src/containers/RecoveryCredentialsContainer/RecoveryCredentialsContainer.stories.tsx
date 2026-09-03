//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { ProcessManagerPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { type Client, PublicKey } from '@dxos/client';
import { invariant } from '@dxos/invariant';
import { IdentityRecovery } from '@dxos/protocols/proto/dxos/halo/credentials';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { ClientPlugin } from '#plugin';
import { initializeIdentity } from '#testing';
import { translations } from '#translations';

import { RecoveryCredentialsContainer } from './RecoveryCredentialsContainer.tsx';

type SeedCredential = { label: string; kind: IdentityRecovery.Kind; algorithm: string };

/**
 * Writes recovery credentials straight through `IdentityService` rather than clicking the create
 * buttons: the create operations finish by opening a dialog, and no layout plugin is mounted here.
 */
const seedCredentials = (client: Client, credentials: SeedCredential[]) =>
  Effect.gen(function* () {
    const identityService = client.services.services.IdentityService;
    invariant(identityService, 'IdentityService not available');
    for (const { label, kind, algorithm } of credentials) {
      yield* Effect.promise(() =>
        identityService.createRecoveryCredential({
          data: { recoveryKey: PublicKey.random(), lookupKey: PublicKey.random(), algorithm, label, kind },
        }),
      );
    }
  });

const decorators = (credentials: SeedCredential[] = []) => [
  withTheme(),
  withLayout({ layout: 'fullscreen' }),
  withPluginManager({
    plugins: [
      ClientPlugin({
        onClientInitialized: ({ client }) =>
          Effect.gen(function* () {
            yield* initializeIdentity(client);
            yield* seedCredentials(client, credentials);
          }),
      }),
      ProcessManagerPlugin(),
    ],
  }),
];

const PASSKEY: SeedCredential = { label: 'Laptop passkey', kind: IdentityRecovery.Kind.PASSKEY, algorithm: 'ES256' };
const RECOVERY_CODE: SeedCredential = {
  label: 'Backup code',
  kind: IdentityRecovery.Kind.RECOVERY_CODE,
  algorithm: 'ED25519',
};

const meta = {
  title: 'plugins/plugin-client/containers/RecoveryCredentialsContainer',
  component: RecoveryCredentialsContainer,
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof RecoveryCredentialsContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

/** No credentials, so the container warns that the account cannot be recovered. */
export const Default: Story = {
  decorators: decorators(),
};

/** A single credential cannot be revoked, so no revoke action is offered. */
export const OneCredential: Story = {
  decorators: decorators([PASSKEY]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(async () => expect(canvas.getByText('Laptop passkey')).toBeInTheDocument(), { timeout: 20_000 });
    await expect(canvas.queryByRole('button', { name: 'Revoke' })).toBeNull();
    await expect(canvas.getByText(/only way back into your account/)).toBeInTheDocument();
  },
};

/** Revoking marks the credential spent and protects whichever one remains. */
export const Revoke: Story = {
  decorators: decorators([PASSKEY, RECOVERY_CODE]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(async () => expect(canvas.getByText('Laptop passkey')).toBeInTheDocument(), { timeout: 20_000 });
    await expect(canvas.getByText('Backup code')).toBeInTheDocument();
    await expect(canvas.getAllByRole('button', { name: 'Revoke' })).toHaveLength(2);

    // The confirmation is a native dialog, which cannot be driven from the test environment.
    const confirm = window.confirm;
    window.confirm = () => true;
    try {
      await userEvent.click(canvas.getAllByRole('button', { name: 'Revoke' })[0]);
      // The list re-renders off the HALO credential stream, with no explicit refresh.
      await waitFor(async () => expect(canvas.getByText('Revoked')).toBeInTheDocument(), { timeout: 10_000 });
      // The survivor is now the only active credential, so its revoke action is withdrawn.
      await expect(canvas.queryByRole('button', { name: 'Revoke' })).toBeNull();
      await expect(canvas.getByText(/only way back into your account/)).toBeInTheDocument();
    } finally {
      window.confirm = confirm;
    }
  },
};

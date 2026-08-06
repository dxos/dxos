//
// Copyright 2026 DXOS.org
//

import { describe, onTestFinished, test, vi } from 'vitest';

import type * as Capabilities from '@dxos/app-framework/Capabilities';
import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import type * as Operation from '@dxos/compute/Operation';
import { ClientOperation } from '@dxos/plugin-client';

import { OnboardingManager } from './onboarding-manager';

// No hubUrl is passed, so auth is skipped — the local/dev Composer configuration.
describe('OnboardingManager', () => {
  test('device invitation opens the join flow without auto-creating an identity', async ({ expect }) => {
    const { manager, getCalls } = await createManager({ deviceInvitationCode: 'test-code' });
    await manager.initialize();

    expect(getCalls(ClientOperation.JoinIdentity)).toEqual([
      expect.objectContaining({ input: { invitationCode: 'test-code' } }),
    ]);
    expect(getCalls(ClientOperation.CreateIdentity)).toHaveLength(0);
  });

  test('without a device invitation a fresh identity is created', async ({ expect }) => {
    const { manager, getCalls } = await createManager({});
    await manager.initialize();

    expect(getCalls(ClientOperation.CreateIdentity)).toHaveLength(1);
    expect(getCalls(ClientOperation.JoinIdentity)).toHaveLength(0);
  });

  test('device invitation with an existing identity opens the reset dialog and stops', async ({ expect }) => {
    const { manager, calls } = await createManager({ identity: true, deviceInvitationCode: 'test-code' });
    await manager.initialize();

    // The reset confirmation must be the only operation — no recovery/agent provisioning
    // for an identity the user may be about to abandon.
    expect(calls).toEqual([
      expect.objectContaining({
        key: String(ClientOperation.ResetStorage.meta.key),
        input: { mode: 'join-new-identity' },
      }),
    ]);
  });

  test('url-driven signup with an already-registered email creates no identity', async ({ expect }) => {
    const { manager, getCalls } = await createManager({
      hubUrl: 'https://hub.example.com',
      email: 'existing@example.com',
      accountInvitationCode: 'XK4F9P2A',
      emailExists: true,
    });
    await manager.initialize();

    // Redemption would reject the duplicate email, stranding this identity unbindable.
    expect(getCalls(ClientOperation.CreateIdentity)).toHaveLength(0);
    expect(getCalls(ClientOperation.CreateAgent)).toHaveLength(0);
  });
});

const createClient = async () => {
  const builder = new TestBuilder();
  const client = new Client({ services: builder.createLocalClientServices() });
  await client.initialize();
  onTestFinished(async () => {
    await client.destroy();
    await builder.destroy();
  });
  return client;
};

const createInvoker = () => {
  const calls: { key: string; input: unknown }[] = [];
  const invokePromise: Capabilities.OperationInvoker['invokePromise'] = async (operation, ...args) => {
    calls.push({ key: String(operation.meta.key), input: args[0] });
    return {};
  };
  const getCalls = (operation: Operation.Definition.Any) =>
    calls.filter((call) => call.key === String(operation.meta.key));
  return { invokePromise, getCalls, calls };
};

/**
 * Stubs the `/account/email/exists` probe. Any other hub request throws so a test can't
 * pass off the back of a silently-failing fetch.
 */
const stubEmailExists = (exists: boolean) => {
  vi.stubGlobal('fetch', async (input: unknown) => {
    if (!(input instanceof URL) || input.pathname !== '/account/email/exists') {
      throw new Error(`Unexpected hub request: ${String(input)}`);
    }
    return new Response(JSON.stringify({ success: true, data: { exists } }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });
  onTestFinished(() => {
    vi.unstubAllGlobals();
  });
};

const createManager = async (options: {
  identity?: boolean;
  deviceInvitationCode?: string;
  hubUrl?: string;
  email?: string;
  accountInvitationCode?: string;
  emailExists?: boolean;
}) => {
  const client = await createClient();
  if (options.identity) {
    await client.halo.createIdentity();
  }
  if (options.emailExists !== undefined) {
    stubEmailExists(options.emailExists);
  }
  const { invokePromise, getCalls, calls } = createInvoker();
  const manager = new OnboardingManager({
    invokePromise,
    client,
    deviceInvitationCode: options.deviceInvitationCode,
    hubUrl: options.hubUrl,
    email: options.email,
    accountInvitationCode: options.accountInvitationCode,
  });
  onTestFinished(() => manager.destroy());
  return { manager, getCalls, calls };
};

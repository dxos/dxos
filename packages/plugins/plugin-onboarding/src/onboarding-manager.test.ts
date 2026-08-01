//
// Copyright 2026 DXOS.org
//

import { describe, onTestFinished, test } from 'vitest';

import { type Capabilities } from '@dxos/app-framework';
import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { type Operation } from '@dxos/compute';
import { ClientOperation } from '@dxos/plugin-client';

import { OnboardingManager } from './onboarding-manager';

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
  return { invokePromise, getCalls };
};

const createManager = async (options: { identity?: boolean; deviceInvitationCode?: string }) => {
  const client = await createClient();
  if (options.identity) {
    await client.halo.createIdentity();
  }
  const { invokePromise, getCalls } = createInvoker();
  const manager = new OnboardingManager({ invokePromise, client, deviceInvitationCode: options.deviceInvitationCode });
  onTestFinished(() => manager.destroy());
  return { manager, getCalls };
};

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

  test('device invitation with an existing identity opens the reset dialog', async ({ expect }) => {
    const { manager, getCalls } = await createManager({ identity: true, deviceInvitationCode: 'test-code' });
    await manager.initialize();

    expect(getCalls(ClientOperation.ResetStorage)).toEqual([
      expect.objectContaining({ input: { mode: 'join-new-identity' } }),
    ]);
    expect(getCalls(ClientOperation.JoinIdentity)).toHaveLength(0);
    expect(getCalls(ClientOperation.CreateIdentity)).toHaveLength(0);
  });
});

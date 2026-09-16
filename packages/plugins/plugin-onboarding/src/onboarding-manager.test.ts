//
// Copyright 2026 DXOS.org
//

import { describe, onTestFinished, test, vi } from 'vitest';

import type * as Capabilities from '@dxos/app-framework/Capabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import type * as Operation from '@dxos/compute/Operation';
import { ClientOperation } from '@dxos/plugin-client';
import { InvalidRecoveryTokenError } from '@dxos/protocols';

import { WELCOME_SCREEN } from './constants.ts';
import { OnboardingManager } from './onboarding-manager.ts';

/** The HALO adapter's wrapper shape: the cause travels under `context.error` rather than `cause`. */
class WrappedIdentityError extends Error {
  constructor(public readonly context: { error: unknown }) {
    super('Identity operation failed');
    this.name = 'IdentityError';
  }
}

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

  test('a pending device invitation opens the join dialog without the welcome screen', async ({ expect }) => {
    // Both dialogs would race through the operation layer, and a welcome update landing second
    // hides the join dialog — the device-join flow then stalls with no invitation input.
    const { manager, calls } = await createManager({
      hubUrl: 'https://hub.example.com',
      deviceInvitationCode: 'test-code',
    });
    await manager.initialize();

    const dialogSubjects = calls
      .filter((call) => call.key === String(LayoutOperation.UpdateDialog.meta.key))
      .map((call) => (call.input as { subject?: string }).subject);
    expect(dialogSubjects).not.toContain(WELCOME_SCREEN);
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
      emailProbe: 'exists',
    });
    await manager.initialize();

    // Redemption would reject the duplicate email, stranding this identity unbindable.
    expect(getCalls(ClientOperation.CreateIdentity)).toHaveLength(0);
    expect(getCalls(ClientOperation.CreateAgent)).toHaveLength(0);
  });

  test('url-driven signup creates no identity when the email probe is rate-limited', async ({ expect }) => {
    const { manager, getCalls } = await createManager({
      hubUrl: 'https://hub.example.com',
      email: 'unknown@example.com',
      accountInvitationCode: 'XK4F9P2A',
      emailProbe: 'unavailable',
    });
    await manager.initialize();

    // An inconclusive probe says nothing about the address, so proceeding could still
    // strand an identity that redemption refuses to bind.
    expect(getCalls(ClientOperation.CreateIdentity)).toHaveLength(0);
    expect(getCalls(ClientOperation.CreateAgent)).toHaveLength(0);
  });

  test('a refused token reports the link as expired', async ({ expect }) => {
    const { manager, toastIds } = await createManager({
      hubUrl: 'https://hub.example.com',
      token: 'test-token',
      redeemTokenError: new WrappedIdentityError({ error: new InvalidRecoveryTokenError() }),
    });
    await manager.initialize();

    expect(toastIds()).toEqual(['login-link-expired-toast']);
  });

  test('any other redemption failure reports a failed login, not an expired link', async ({ expect }) => {
    const { manager, toastIds } = await createManager({
      hubUrl: 'https://hub.example.com',
      token: 'test-token',
      redeemTokenError: new WrappedIdentityError({ error: new Error('Halo space not initialized.') }),
    });
    await manager.initialize();

    expect(toastIds()).toEqual(['login-failed-toast']);
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

const createInvoker = (failures: Map<string, Error> = new Map()) => {
  const calls: { key: string; input: unknown }[] = [];
  const invokePromise: Capabilities.OperationInvoker['invokePromise'] = async (operation, ...args) => {
    const key = String(operation.meta.key);
    calls.push({ key, input: args[0] });
    // `invokePromise` reports a failed operation as `{ error }` rather than by rejecting.
    return failures.has(key) ? { error: failures.get(key) } : {};
  };
  const getCalls = (operation: Operation.Definition.Any) =>
    calls.filter((call) => call.key === String(operation.meta.key));
  const toastIds = () =>
    calls
      .filter((call) => call.key === String(LayoutOperation.AddToast.meta.key))
      .map((call) => (call.input as { id: string }).id);
  return { invokePromise, getCalls, calls, toastIds };
};

/**
 * Stubs the `/account/email/exists` probe. Any other hub request throws so a test can't
 * pass off the back of a silently-failing fetch. `'unavailable'` simulates the rate-limit
 * response, which must not be read as "this email is free".
 */
const stubEmailProbe = (outcome: 'exists' | 'available' | 'unavailable') => {
  vi.stubGlobal('fetch', async (input: unknown) => {
    if (!(input instanceof URL) || input.pathname !== '/account/email/exists') {
      throw new Error(`Unexpected hub request: ${String(input)}`);
    }
    if (outcome === 'unavailable') {
      return new Response(JSON.stringify({ success: false, message: 'Too many requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ success: true, data: { exists: outcome === 'exists' } }), {
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
  token?: string;
  email?: string;
  accountInvitationCode?: string;
  emailProbe?: 'exists' | 'available' | 'unavailable';
  redeemTokenError?: Error;
}) => {
  const client = await createClient();
  if (options.identity) {
    await client.halo.createIdentity();
  }
  if (options.emailProbe !== undefined) {
    stubEmailProbe(options.emailProbe);
  }
  const failures = new Map<string, Error>();
  if (options.redeemTokenError !== undefined) {
    failures.set(String(ClientOperation.RedeemToken.meta.key), options.redeemTokenError);
  }
  const { invokePromise, getCalls, calls, toastIds } = createInvoker(failures);
  const manager = new OnboardingManager({
    invokePromise,
    client,
    deviceInvitationCode: options.deviceInvitationCode,
    hubUrl: options.hubUrl,
    token: options.token,
    email: options.email,
    accountInvitationCode: options.accountInvitationCode,
  });
  onTestFinished(() => manager.destroy());
  return { manager, getCalls, calls, toastIds };
};

//
// Copyright 2026 DXOS.org
//

import { describe, onTestFinished, test, vi } from 'vitest';

import type * as Capabilities from '@dxos/app-framework/Capabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Trigger } from '@dxos/async';
import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import type * as Operation from '@dxos/compute/Operation';
import * as ClientOperation from '@dxos/plugin-client/ClientOperation';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { InvalidRecoveryTokenError } from '@dxos/protocols';

import { WELCOME_SCREEN } from './constants.ts';
import { OnboardingManager } from './onboarding-manager.ts';
import {
  PENDING_SPACE_INVITATION_KEY,
  PendingSpaceInvitation,
  type PendingSpaceInvitationStorage,
} from './pending-space-invitation.ts';

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

    expect(dialogSubjects(calls)).not.toContain(WELCOME_SCREEN);
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
        input: { mode: 'join-new-identity', invitationCode: 'test-code' },
      }),
    ]);
  });

  test('a logout with auth disabled brings up a fresh identity in place', async ({ expect }) => {
    const { manager, getCalls } = await createManager({ identity: true });
    await manager.onIdentityDeleted();

    expect(getCalls(ClientOperation.CreateIdentity)).toHaveLength(1);
  });

  test('a logout with auth enabled returns to the welcome screen', async ({ expect }) => {
    const { manager, calls, getCalls } = await createManager({ identity: true, hubUrl: 'https://hub.example.com' });
    await manager.onIdentityDeleted();

    expect(dialogSubjects(calls)).toContain(WELCOME_SCREEN);
    expect(getCalls(ClientOperation.CreateIdentity)).toHaveLength(0);
  });

  test('a deletion that hands over to a join or recovery flow is left to it', async ({ expect }) => {
    const { manager, calls } = await createManager({ identity: true });
    await manager.onIdentityDeleted({ target: 'deviceInvitation' });
    await manager.onIdentityDeleted({ target: 'recoverIdentity' });

    expect(calls).toEqual([]);
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

  test('a space invitation opened behind the gate is redeemed once the user is through it', async ({ expect }) => {
    const { manager, client, calls, getCalls } = await createManager({
      hubUrl: 'https://hub.example.com',
      spaceInvitationCode: 'space-code',
    });
    await manager.initialize();
    expect(dialogSubjects(calls)).toEqual([WELCOME_SCREEN]);
    expect(getCalls(SpaceOperation.Join)).toHaveLength(0);

    await client.halo.createIdentity();

    await expect
      .poll(() => getCalls(SpaceOperation.Join))
      .toEqual([expect.objectContaining({ input: { invitationCode: 'space-code' } })]);
  });

  test('a tab that boots signed in redeems the invitation held behind the gate', async ({ expect }) => {
    // A magic-link or OAuth tab can create the identity before this manager exists.
    const storage = createMemoryStorage();
    new PendingSpaceInvitation(storage).stash('space-code');
    const { manager, getCalls } = await createManager({ identity: true, hubUrl: 'https://hub.example.com', storage });
    await manager.initialize();

    await expect
      .poll(() => getCalls(SpaceOperation.Join))
      .toEqual([expect.objectContaining({ input: { invitationCode: 'space-code' } })]);
  });

  test('the welcome closes when the identity appears, without waiting on the held invitation', async ({ expect }) => {
    const claim = new Trigger();
    class SlowPendingSpaceInvitation extends PendingSpaceInvitation {
      override async take() {
        await claim.wait();
        return super.take();
      }
    }
    const { manager, client, calls, getCalls } = await createManager({
      hubUrl: 'https://hub.example.com',
      spaceInvitationCode: 'space-code',
      pendingSpaceInvitation: new SlowPendingSpaceInvitation(createMemoryStorage()),
    });
    onTestFinished(() => {
      claim.wake();
    });
    await manager.initialize();
    await client.halo.createIdentity();

    await expect.poll(() => closes(calls)).toBe(1);
    expect(getCalls(SpaceOperation.Join)).toHaveLength(0);
    claim.wake();
    await expect.poll(() => getCalls(SpaceOperation.Join)).toHaveLength(1);
    expect(closes(calls)).toBe(1);
  });

  test('a hidden tab leaves the held invitation until the user comes back to it', async ({ expect }) => {
    const page = stubHiddenPage();
    const { manager, client, calls, getCalls } = await createManager({
      hubUrl: 'https://hub.example.com',
      spaceInvitationCode: 'space-code',
    });
    await manager.initialize();
    await client.halo.createIdentity();

    await expect.poll(() => closes(calls)).toBe(1);
    expect(getCalls(SpaceOperation.Join)).toHaveLength(0);
    page.show();
    await expect.poll(() => getCalls(SpaceOperation.Join)).toHaveLength(1);
  });

  test('a hidden tab that boots signed in leaves the held invitation until it is visible', async ({ expect }) => {
    const page = stubHiddenPage();
    const storage = createMemoryStorage();
    new PendingSpaceInvitation(storage).stash('space-code');
    const { manager, getCalls } = await createManager({ identity: true, hubUrl: 'https://hub.example.com', storage });
    await manager.initialize();
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(getCalls(SpaceOperation.Join)).toHaveLength(0);
    expect(storage.getItem(PENDING_SPACE_INVITATION_KEY)).not.toBeNull();
    page.show();
    await expect.poll(() => getCalls(SpaceOperation.Join)).toHaveLength(1);
  });

  test('a tab hidden again by the time the lock is granted claims once it is visible again', async ({ expect }) => {
    const page = stubHiddenPage();
    const locks = stubHeldLocks();
    const storage = createMemoryStorage();
    new PendingSpaceInvitation(storage).stash('space-code');
    const { manager, getCalls } = await createManager({ identity: true, hubUrl: 'https://hub.example.com', storage });
    await manager.initialize();

    page.show();
    await expect.poll(() => locks.waiting).toBe(1);
    page.hide();
    locks.grant();
    await expect.poll(() => locks.waiting).toBe(0);
    expect(getCalls(SpaceOperation.Join)).toHaveLength(0);
    expect(storage.getItem(PENDING_SPACE_INVITATION_KEY)).not.toBeNull();

    page.show();
    await expect.poll(() => locks.waiting).toBe(1);
    locks.grant();
    await expect.poll(() => getCalls(SpaceOperation.Join)).toHaveLength(1);
  });

  test('a tab signed out while hidden leaves the invitation held for the next sign-in', async ({ expect }) => {
    const page = stubHiddenPage();
    const storage = createMemoryStorage();
    const { manager, client, getCalls } = await createManager({
      hubUrl: 'https://hub.example.com',
      spaceInvitationCode: 'space-code',
      storage,
    });
    await manager.initialize();
    await client.halo.createIdentity();
    await client.halo.deleteIdentity();
    await expect.poll(() => client.halo.identity.get()).toBeNull();
    page.show();
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(getCalls(SpaceOperation.Join)).toHaveLength(0);
    expect(await new PendingSpaceInvitation(storage).take()).toBe('space-code');
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

/** The subjects of every dialog the manager opened, in order. */
const dialogSubjects = (calls: readonly { key: string; input: unknown }[]) =>
  calls
    .filter((call) => call.key === String(LayoutOperation.UpdateDialog.meta.key))
    .map((call) => (call.input as { subject?: string }).subject);

/** A hidden page; `show` brings it to the front. */
const stubHiddenPage = () => {
  const page = Object.assign(new EventTarget(), { visibilityState: 'hidden' });
  vi.stubGlobal('document', page);
  onTestFinished(() => {
    vi.unstubAllGlobals();
  });
  const setVisibility = (state: 'visible' | 'hidden') => {
    page.visibilityState = state;
    page.dispatchEvent(new Event('visibilitychange'));
  };
  return {
    show: () => setVisibility('visible'),
    hide: () => setVisibility('hidden'),
  };
};

/** Web Locks that hold each request until `grant` runs the oldest. */
const stubHeldLocks = () => {
  const requests: (() => void)[] = [];
  vi.stubGlobal('navigator', {
    locks: {
      request: (_name: string, callback: () => unknown) =>
        new Promise((resolve) => requests.push(() => resolve(callback()))),
    },
  });
  onTestFinished(() => {
    vi.unstubAllGlobals();
  });
  return {
    get waiting() {
      return requests.length;
    },
    grant: () => requests.shift()?.(),
  };
};

/** How many times the manager closed the dialog. */
const closes = (calls: readonly { key: string; input: unknown }[]) =>
  calls.filter(
    (call) =>
      call.key === String(LayoutOperation.UpdateDialog.meta.key) && (call.input as { state?: boolean }).state === false,
  ).length;

const createMemoryStorage = (): PendingSpaceInvitationStorage => {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
};

const createManager = async (options: {
  identity?: boolean;
  deviceInvitationCode?: string;
  spaceInvitationCode?: string;
  hubUrl?: string;
  token?: string;
  email?: string;
  accountInvitationCode?: string;
  emailProbe?: 'exists' | 'available' | 'unavailable';
  redeemTokenError?: Error;
  storage?: PendingSpaceInvitationStorage;
  pendingSpaceInvitation?: PendingSpaceInvitation;
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
    spaceInvitationCode: options.spaceInvitationCode,
    pendingSpaceInvitation:
      options.pendingSpaceInvitation ?? new PendingSpaceInvitation(options.storage ?? createMemoryStorage()),
    hubUrl: options.hubUrl,
    token: options.token,
    email: options.email,
    accountInvitationCode: options.accountInvitationCode,
  });
  onTestFinished(() => manager.destroy());
  return { manager, client, getCalls, calls, toastIds };
};

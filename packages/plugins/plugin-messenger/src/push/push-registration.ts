//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';

import type * as AppPush from '@dxos/app-toolkit/AppPush';
import { log } from '@dxos/log';
import { EdgeCallFailedError, type PushSubscribeRequest, type VapidPublicKeyResponse } from '@dxos/protocols';

/** The EDGE routes push registration uses (`EdgeHttpClient`), bound to a context by the caller. */
export type PushEdge = {
  getVapidPublicKey: () => Promise<VapidPublicKeyResponse>;
  putPushSubscription: (subscription: PushSubscribeRequest) => Promise<void>;
  deletePushSubscription: (endpoint: string) => Promise<void>;
};

export type PushRegistrationOptions = {
  /** Read on every call: the platform plugin may contribute its provider after registration is created. */
  provider: () => AppPush.Provider | undefined;
  edge: PushEdge;
  /** `error` describes a `failed` attempt. */
  setStatus: (status: AppPush.Status, error?: string) => void;
  /** Records the user's choice; written before registering, so a restart can finish what a quit cut short. */
  setEnabled: (enabled: boolean) => void;
  /** How long `sendTest` waits for the test notification to reach this device. */
  testTimeout?: Duration.Input;
};

/** A test push normally arrives well under a second after EDGE sends it; this leaves room for a slow push service. */
const DEFAULT_TEST_TIMEOUT = Duration.seconds(10);

export type PushRegistration = {
  /**
   * Asks for permission, subscribes this device and registers it with EDGE; resolves to the resulting status.
   * Call it straight from the user's click: the permission prompt is the first thing it awaits.
   */
  enable: () => Promise<AppPush.Status>;
  /** Unregisters this device from EDGE. */
  disable: () => Promise<AppPush.Status>;
  /**
   * Re-registers without asking, for a device the user already opted in on: covers a subscription the browser
   * replaced or dropped, a key rotation on EDGE, and a registration a quit cut short. Never prompts.
   */
  refresh: () => Promise<AppPush.Status>;
  /** Re-registers asking EDGE for a test push, and resolves whether it reached this device. */
  sendTest: () => Promise<AppPush.TestResult>;
};

const isNotConfigured = (error: unknown) => error instanceof EdgeCallFailedError && error.status === 404;

/** EDGE's answer when the test push showed the push service no longer knows the subscription. */
const isGone = (error: unknown) => error instanceof EdgeCallFailedError && error.status === 410;

/** A browser's `DOMException` names the failure (`AbortError`, `NotAllowedError`) apart from its message. */
const describeError = (error: unknown): string =>
  error instanceof Error
    ? error.name && error.name !== 'Error'
      ? `${error.name}: ${error.message}`
      : error.message
    : String(error);

/** Push registration for one device, shared by every platform: the provider differs, the EDGE routes do not. */
export const makePushRegistration = ({
  provider: currentProvider,
  edge,
  setStatus,
  setEnabled,
  testTimeout = DEFAULT_TEST_TIMEOUT,
}: PushRegistrationOptions): PushRegistration => {
  const settle = (status: AppPush.Status): AppPush.Status => {
    setStatus(status);
    return status;
  };

  /** Subscribes and registers with EDGE; with `test`, `shown` says whether the test push reached this device. */
  const register = async (
    provider: AppPush.Provider,
    test: boolean,
  ): Promise<{ status: AppPush.Status; shown?: Promise<boolean> }> => {
    let publicKey: string;
    try {
      ({ publicKey } = await edge.getVapidPublicKey());
    } catch (error) {
      if (isNotConfigured(error)) {
        return { status: settle('unsupported') };
      }
      throw error;
    }
    const { endpoint, keys } = await provider.subscribe({ applicationServerKey: publicKey });
    // EDGE pushes the test before it answers, so listening has to start first.
    const shown = test ? provider.waitForTest(testTimeout) : undefined;
    try {
      await edge.putPushSubscription({ endpoint, keys, test });
    } catch (error) {
      if (!isGone(error)) {
        throw error;
      }
      // The browser kept a subscription its push service has dropped; only a fresh one reaches this device.
      await provider.unsubscribe();
      const fresh = await provider.subscribe({ applicationServerKey: publicKey });
      await edge.putPushSubscription({ endpoint: fresh.endpoint, keys: fresh.keys, test });
    }
    return { status: settle('on'), shown };
  };

  const fail = (error: unknown): AppPush.Status => {
    log.warn('push registration failed', { error });
    setStatus('failed', describeError(error));
    return 'failed';
  };

  const run = async (task: () => Promise<AppPush.Status>): Promise<AppPush.Status> => {
    try {
      return await task();
    } catch (error) {
      return fail(error);
    }
  };

  return {
    enable: () =>
      run(async () => {
        const provider = currentProvider();
        if (!provider?.supported) {
          return settle('unsupported');
        }
        setStatus('pending');
        const permission = await provider.requestPermission();
        if (permission !== 'granted') {
          setEnabled(false);
          return settle(permission === 'denied' ? 'denied' : 'off');
        }
        setEnabled(true);
        return (await register(provider, false)).status;
      }),

    disable: () =>
      run(async () => {
        setEnabled(false);
        const provider = currentProvider();
        if (!provider?.supported) {
          return settle('unsupported');
        }
        const subscription = await provider.current();
        if (subscription) {
          // The browser subscription is kept: dropping it and subscribing again seconds later left Chrome holding one
          // its push service had already forgotten. With EDGE's copy gone, nothing pushes to it.
          await edge.deletePushSubscription(subscription.endpoint).catch(async (error) => {
            log.warn('failed to unregister push subscription', { error });
            // EDGE still has it, so unsubscribing is the only way to stop the pushes.
            await provider.unsubscribe();
          });
        }
        return settle('off');
      }),

    refresh: () =>
      run(async () => {
        const provider = currentProvider();
        if (!provider?.supported) {
          return settle('unsupported');
        }
        switch (provider.permission()) {
          case 'granted':
            return (await register(provider, false)).status;
          case 'denied':
            return settle('denied');
          default:
            return settle('off');
        }
      }),

    sendTest: async () => {
      const provider = currentProvider();
      if (!provider?.supported || provider.permission() !== 'granted') {
        return 'failed';
      }
      try {
        const { status, shown } = await register(provider, true);
        if (status !== 'on' || !shown) {
          return 'failed';
        }
        return (await shown) ? 'shown' : 'not-shown';
      } catch (error) {
        fail(error);
        return 'failed';
      }
    },
  };
};

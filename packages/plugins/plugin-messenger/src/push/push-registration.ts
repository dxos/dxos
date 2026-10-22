//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';

import type * as AppPush from '@dxos/app-toolkit/AppPush';
import { log } from '@dxos/log';
import { EdgeCallFailedError, type PushSubscribeRequest, type VapidPublicKeyResponse } from '@dxos/protocols';

import { type MessengerCapabilities } from '#types';

/**
 * - `unsupported`: no push provider here, or EDGE has push turned off.
 * - `denied`: the user blocked notifications for Composer in the browser or OS.
 */
export type PushStatus = MessengerCapabilities.PushStatus;

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
  setStatus: (status: PushStatus, error?: string) => void;
  /** How long `enable` waits for the sample push before calling the device unconfirmed. */
  sampleTimeout?: Duration.Input;
};

/** A sample normally arrives well under a second after EDGE sends it; this leaves room for a slow push service. */
const DEFAULT_SAMPLE_TIMEOUT = Duration.seconds(10);

export type PushRegistration = {
  /**
   * Asks for permission, subscribes this device and registers it with EDGE; resolves to the resulting status.
   * Call it straight from the user's click: the permission prompt is the first thing it awaits.
   */
  enable: () => Promise<PushStatus>;
  /** Unregisters and unsubscribes this device. */
  disable: () => Promise<PushStatus>;
  /**
   * Re-registers without asking, for a device the user already opted in on: covers a subscription the browser
   * replaced or dropped, and a key rotation on EDGE. Never prompts.
   */
  refresh: () => Promise<PushStatus>;
};

const isNotConfigured = (error: unknown) => error instanceof EdgeCallFailedError && error.status === 404;

/** EDGE's answer when the sample showed the push service no longer knows the subscription. */
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
  sampleTimeout = DEFAULT_SAMPLE_TIMEOUT,
}: PushRegistrationOptions): PushRegistration => {
  const settle = (status: PushStatus): PushStatus => {
    setStatus(status);
    return status;
  };

  /** `welcome` asks EDGE for a sample notification, which only the user's own opt-in should trigger. */
  const register = async (provider: AppPush.Provider, welcome: boolean): Promise<PushStatus> => {
    let publicKey: string;
    try {
      ({ publicKey } = await edge.getVapidPublicKey());
    } catch (error) {
      if (isNotConfigured(error)) {
        return settle('unsupported');
      }
      throw error;
    }
    const { endpoint, keys } = await provider.subscribe({ applicationServerKey: publicKey });
    // EDGE pushes the sample before it answers, so listening has to start first.
    const sample = welcome ? provider.waitForSample(sampleTimeout) : undefined;
    try {
      await edge.putPushSubscription({ endpoint, keys, welcome });
    } catch (error) {
      if (!isGone(error)) {
        throw error;
      }
      // The browser kept a subscription its push service has dropped; only a fresh one reaches this device.
      await provider.unsubscribe();
      const fresh = await provider.subscribe({ applicationServerKey: publicKey });
      await edge.putPushSubscription({ endpoint: fresh.endpoint, keys: fresh.keys, welcome });
    }
    if (sample && !(await sample)) {
      return settle('unconfirmed');
    }
    return settle('on');
  };

  const run = async (task: () => Promise<PushStatus>): Promise<PushStatus> => {
    try {
      return await task();
    } catch (error) {
      log.warn('push registration failed', { error });
      setStatus('failed', describeError(error));
      return 'failed';
    }
  };

  return {
    enable: () =>
      run(async () => {
        const provider = currentProvider();
        if (!provider?.supported) {
          return settle('unsupported');
        }
        // The browser's push service can take a while to answer, and the toggle already reads on.
        setStatus('pending');
        const permission = await provider.requestPermission();
        if (permission !== 'granted') {
          return settle(permission === 'denied' ? 'denied' : 'off');
        }
        return register(provider, true);
      }),

    disable: () =>
      run(async () => {
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
            return register(provider, false);
          case 'denied':
            return settle('denied');
          default:
            return settle('off');
        }
      }),
  };
};

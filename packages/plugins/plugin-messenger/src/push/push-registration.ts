//
// Copyright 2026 DXOS.org
//

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
  provider: AppPush.Provider | undefined;
  edge: PushEdge;
  setStatus: (status: PushStatus) => void;
};

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

/** Push registration for one device, shared by every platform: the provider differs, the EDGE routes do not. */
export const makePushRegistration = ({ provider, edge, setStatus }: PushRegistrationOptions): PushRegistration => {
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
    await edge.putPushSubscription({ endpoint, keys, welcome });
    return settle('on');
  };

  const run = async (task: () => Promise<PushStatus>): Promise<PushStatus> => {
    try {
      return await task();
    } catch (error) {
      log.warn('push registration failed', { error });
      return settle('failed');
    }
  };

  return {
    enable: () =>
      run(async () => {
        if (!provider?.supported) {
          return settle('unsupported');
        }
        const permission = await provider.requestPermission();
        if (permission !== 'granted') {
          return settle(permission === 'denied' ? 'denied' : 'off');
        }
        return register(provider, true);
      }),

    disable: () =>
      run(async () => {
        if (!provider?.supported) {
          return settle('unsupported');
        }
        const subscription = await provider.current();
        if (subscription) {
          // Unsubscribing alone would also stop delivery, but EDGE would keep pushing to a dead endpoint until the
          // push service answered 410.
          await edge.deletePushSubscription(subscription.endpoint).catch((error) => {
            log.warn('failed to unregister push subscription', { error });
          });
          await provider.unsubscribe();
        }
        return settle('off');
      }),

    refresh: () =>
      run(async () => {
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

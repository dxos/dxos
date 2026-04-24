//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useMemo, useState } from 'react';

import { log } from '@dxos/log';

import { type TelegramUserConnectionStatus } from '#types';

/**
 * Deferred<T> is a promise plus its resolver — lets us bridge gramjs's
 * callback-driven login flow (phoneCode, password) into React state.
 * The user fills a form, we call resolve(value), gramjs unblocks.
 */
type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (err: unknown) => void;
};

const makeDeferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

export type StartLoginArgs = {
  apiId: number;
  apiHash: string;
  phoneNumber: string;
};

export type UseTelegramUserClientResult = {
  status: TelegramUserConnectionStatus;
  error?: string;
  /** Dynamically-imported client (null until gramjs has loaded). */
  client: any;
  /** Kick off the login flow. Status will transition to `need-code`, then (maybe) `need-password`, then `connected`. */
  startLogin: (args: StartLoginArgs) => Promise<string | undefined>;
  /** Supply the SMS code from the user; unblocks the login promise. */
  submitCode: (code: string) => void;
  /** Supply the 2FA password from the user; unblocks the login promise. */
  submitPassword: (password: string) => void;
  /** Connect using a previously-saved session string (no login needed). */
  connectWithSession: (args: { apiId: number; apiHash: string; sessionString: string }) => Promise<void>;
  /** Fully disconnect and clear the shared client. */
  disconnect: () => Promise<void>;
};

// ---------------------------------------------------------------------------
// Module-level shared state.
//
// Previously each useTelegramUserClient() call created its own TelegramClient.
// With two surfaces (Settings + Feed) that meant two WebSocket connections per
// user and — worse — "forget session" from Settings left Feed's client still
// receiving messages until the tab reloaded. Hoisting to module scope gives
// every consumer the same client + the same disconnect button.
// ---------------------------------------------------------------------------

type SharedState = {
  status: TelegramUserConnectionStatus;
  error?: string;
  client: any;
  codeDeferred?: Deferred<string>;
  passwordDeferred?: Deferred<string>;
};

let sharedState: SharedState = { status: 'disconnected', client: null };

const listeners = new Set<() => void>();

const setSharedState = (patch: Partial<SharedState>) => {
  sharedState = { ...sharedState, ...patch };
  for (const listener of listeners) {
    listener();
  }
};

const loadGramjs = async () => {
  const telegram = await import('telegram');
  const sessions = await import('telegram/sessions');
  return { TelegramClient: telegram.TelegramClient, StringSession: sessions.StringSession };
};

const startLoginImpl = async ({ apiId, apiHash, phoneNumber }: StartLoginArgs): Promise<string | undefined> => {
  try {
    setSharedState({ status: 'logging-in', error: undefined });
    const { TelegramClient, StringSession } = await loadGramjs();
    const session = new StringSession('');
    const next = new TelegramClient(session, apiId, apiHash, { connectionRetries: 3 });
    setSharedState({ client: next });

    await next.start({
      phoneNumber: async () => phoneNumber,
      // Create a fresh deferred *inside* the callback. gramjs retries the
      // callback on PHONE_CODE_INVALID / PASSWORD_HASH_INVALID — reusing a
      // resolved deferred would resubmit the stale value forever.
      phoneCode: async () => {
        const deferred = makeDeferred<string>();
        setSharedState({ status: 'need-code', codeDeferred: deferred });
        return deferred.promise;
      },
      password: async () => {
        const deferred = makeDeferred<string>();
        setSharedState({ status: 'need-password', passwordDeferred: deferred });
        return deferred.promise;
      },
      onError: (err: unknown) => {
        log.warn('telegram-user: login error', { error: String(err) });
        setSharedState({ error: String(err) });
      },
    });

    const sessionString = session.save();
    setSharedState({ status: 'connected', codeDeferred: undefined, passwordDeferred: undefined });
    return sessionString;
  } catch (err) {
    setSharedState({
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
      codeDeferred: undefined,
      passwordDeferred: undefined,
    });
    return undefined;
  }
};

const connectWithSessionImpl = async ({
  apiId,
  apiHash,
  sessionString,
}: {
  apiId: number;
  apiHash: string;
  sessionString: string;
}): Promise<void> => {
  // Already connected with a live client — no-op (we could compare session strings, but for now
  // the first caller wins and the second is a no-op to avoid churning the WebSocket).
  if (sharedState.client && sharedState.status === 'connected') {
    return;
  }
  try {
    setSharedState({ status: 'logging-in', error: undefined });
    const { TelegramClient, StringSession } = await loadGramjs();
    const session = new StringSession(sessionString);
    const next = new TelegramClient(session, apiId, apiHash, { connectionRetries: 3 });
    await next.connect();
    // connect() only establishes transport. checkAuthorization() verifies the
    // saved session is still valid; without it we'd mark 'connected' even for
    // revoked sessions and fail downstream inside getDialogs().
    const authorized = await next.checkAuthorization();
    if (!authorized) {
      await next.disconnect().catch(() => undefined);
      setSharedState({
        client: null,
        status: 'error',
        error: 'Saved Telegram session is no longer authorized. Please log in again.',
      });
      return;
    }
    setSharedState({ client: next, status: 'connected' });
  } catch (err) {
    setSharedState({
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

const disconnectImpl = async (): Promise<void> => {
  const { client, codeDeferred, passwordDeferred } = sharedState;
  // Reject any in-flight login deferreds so start()'s promise chain unblocks.
  codeDeferred?.reject(new Error('disconnected'));
  passwordDeferred?.reject(new Error('disconnected'));
  if (client) {
    try {
      await client.disconnect();
    } catch {
      // Ignore disconnect errors.
    }
  }
  setSharedState({
    client: null,
    status: 'disconnected',
    error: undefined,
    codeDeferred: undefined,
    passwordDeferred: undefined,
  });
};

const submitCodeImpl = (code: string) => {
  const deferred = sharedState.codeDeferred;
  // Clear the ref first so a duplicate submit doesn't re-resolve an already-
  // resolved promise, and a fresh prompt cycle can install its own deferred.
  setSharedState({ codeDeferred: undefined, status: 'logging-in' });
  deferred?.resolve(code);
};

const submitPasswordImpl = (password: string) => {
  const deferred = sharedState.passwordDeferred;
  setSharedState({ passwordDeferred: undefined, status: 'logging-in' });
  deferred?.resolve(password);
};

/**
 * Wraps the single module-shared TelegramClient + its login lifecycle.
 *
 * gramjs is lazy-loaded on first use (~500 KB bundle) so unused panels don't
 * pay the cost. Every consumer of this hook gets the same client instance and
 * observes the same status.
 */
export const useTelegramUserClient = (): UseTelegramUserClientResult => {
  const [, forceUpdate] = useState(0);

  // Subscribe to shared-state changes.
  useEffect(() => {
    const listener = () => forceUpdate((tick) => tick + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const startLogin = useCallback(startLoginImpl, []);
  const submitCode = useCallback(submitCodeImpl, []);
  const submitPassword = useCallback(submitPasswordImpl, []);
  const connectWithSession = useCallback(connectWithSessionImpl, []);
  const disconnect = useCallback(disconnectImpl, []);

  return useMemo(
    () => ({
      status: sharedState.status,
      error: sharedState.error,
      client: sharedState.client,
      startLogin,
      submitCode,
      submitPassword,
      connectWithSession,
      disconnect,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sharedState.status, sharedState.error, sharedState.client, startLogin, submitCode, submitPassword, connectWithSession, disconnect],
  );
};

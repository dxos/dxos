//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
  /** Fully disconnect and clear the client. */
  disconnect: () => Promise<void>;
};

/**
 * Wraps a single gramjs TelegramClient instance + its login lifecycle.
 *
 * gramjs is lazy-loaded on first use (~500 KB bundle) so unused panels don't
 * pay the cost. The hook keeps a single client across renders and surfaces
 * its state as a friendly `status` enum.
 */
export const useTelegramUserClient = (): UseTelegramUserClientResult => {
  const [status, setStatus] = useState<TelegramUserConnectionStatus>('disconnected');
  const [error, setError] = useState<string | undefined>();
  const [client, setClient] = useState<any>(null);

  const codeDeferredRef = useRef<Deferred<string> | undefined>(undefined);
  const passwordDeferredRef = useRef<Deferred<string> | undefined>(undefined);

  const loadGramjs = useCallback(async () => {
    // Lazy import — kept in a Function call so Vite doesn't eager-bundle it.
    const telegram = await import('telegram');
    const sessions = await import('telegram/sessions');
    return { TelegramClient: telegram.TelegramClient, StringSession: sessions.StringSession };
  }, []);

  const startLogin = useCallback(
    async ({ apiId, apiHash, phoneNumber }: StartLoginArgs): Promise<string | undefined> => {
      try {
        setStatus('logging-in');
        setError(undefined);
        const { TelegramClient, StringSession } = await loadGramjs();
        const session = new StringSession('');
        const next = new TelegramClient(session, apiId, apiHash, { connectionRetries: 3 });
        setClient(next);

        codeDeferredRef.current = makeDeferred<string>();
        passwordDeferredRef.current = makeDeferred<string>();

        await next.start({
          phoneNumber: async () => phoneNumber,
          phoneCode: async () => {
            setStatus('need-code');
            return codeDeferredRef.current!.promise;
          },
          password: async () => {
            setStatus('need-password');
            return passwordDeferredRef.current!.promise;
          },
          onError: (err: unknown) => {
            log.warn('telegram-user: login error', { error: String(err) });
            setError(String(err));
          },
        });

        const sessionString = session.save();
        setStatus('connected');
        return sessionString;
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : String(err));
        return undefined;
      }
    },
    [loadGramjs],
  );

  const submitCode = useCallback((code: string) => {
    codeDeferredRef.current?.resolve(code);
    setStatus('logging-in');
  }, []);

  const submitPassword = useCallback((password: string) => {
    passwordDeferredRef.current?.resolve(password);
    setStatus('logging-in');
  }, []);

  const connectWithSession = useCallback(
    async ({ apiId, apiHash, sessionString }: { apiId: number; apiHash: string; sessionString: string }) => {
      try {
        setStatus('logging-in');
        setError(undefined);
        const { TelegramClient, StringSession } = await loadGramjs();
        const session = new StringSession(sessionString);
        const next = new TelegramClient(session, apiId, apiHash, { connectionRetries: 3 });
        await next.connect();
        setClient(next);
        setStatus('connected');
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [loadGramjs],
  );

  const disconnect = useCallback(async () => {
    if (client) {
      try {
        await client.disconnect();
      } catch {
        // Ignore disconnect errors.
      }
    }
    setClient(null);
    setStatus('disconnected');
  }, [client]);

  // Cleanup on unmount.
  useEffect(
    () => () => {
      if (client) {
        client.disconnect().catch(() => undefined);
      }
    },
    [client],
  );

  return useMemo(
    () => ({
      status,
      error,
      client,
      startLogin,
      submitCode,
      submitPassword,
      connectWithSession,
      disconnect,
    }),
    [status, error, client, startLogin, submitCode, submitPassword, connectWithSession, disconnect],
  );
};

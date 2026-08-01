//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import { useCallback, useEffect, useState } from 'react';

import { useClient } from '@dxos/react-client';
import { useObject } from '@dxos/react-client/echo';

import { useConnector } from '#hooks';

import { type Connection } from '../types';

export type TestConnectionStatus =
  /** No test has run yet (connection or its token not resolved). */
  | 'idle'
  /** A test is in flight. */
  | 'testing'
  /** The stored credential authenticated successfully. */
  | 'valid'
  /** The stored credential was rejected — {@link UseTestConnectionResult.error} carries the reason. */
  | 'invalid'
  /** The connector declares no `testConnection`, so validity can't be probed. */
  | 'unsupported';

export type UseTestConnectionResult = {
  readonly status: TestConnectionStatus;
  /** User-facing failure reason when `status` is `'invalid'`. */
  readonly error?: string;
  /** Re-run the test (e.g. after the user reauthenticates). */
  readonly retest: () => void;
};

/**
 * Probe whether a {@link Connection}'s stored credential is still valid by
 * running its connector's `testConnection` when the connection is opened.
 * Connectors without a `testConnection` report `'unsupported'` and never fail
 * open. Drives the reauthenticate prompt in the connection settings surface.
 */
export const useTestConnection = (connection: Connection.Connection | undefined): UseTestConnectionResult => {
  const client = useClient();
  const connector = useConnector(connection?.connectorId);
  // Subscribe via `useObject` so the effect re-runs when the token value changes
  // (e.g. after reauthentication); the effect itself needs the live entity, not
  // the reactive snapshot.
  const [accessTokenSnapshot] = useObject(connection?.accessToken);
  const accessToken = connection?.accessToken?.target;
  const [status, setStatus] = useState<TestConnectionStatus>('idle');
  const [error, setError] = useState<string | undefined>(undefined);
  const [nonce, setNonce] = useState(0);

  const retest = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    if (!connection || !connector) {
      return;
    }
    const testConnection = connector.testConnection;
    if (!testConnection) {
      setStatus('unsupported');
      setError(undefined);
      return;
    }
    // Wait for the token ref to resolve before probing.
    if (!accessToken) {
      return;
    }

    let cancelled = false;
    setStatus('testing');
    setError(undefined);

    void Effect.runPromiseExit(
      testConnection({ accessToken, connection, client }).pipe(Effect.provide(FetchHttpClient.layer)),
    ).then((exit) => {
      if (cancelled) {
        return;
      }
      if (Exit.isSuccess(exit)) {
        setStatus('valid');
        setError(undefined);
      } else {
        setStatus('invalid');
        // A defect (unexpected throw) leaves no typed failure — fall back to a generic message.
        setError(Option.getOrUndefined(Cause.failureOption(exit.cause))?.message ?? 'Connection test failed.');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [connection, connector, accessToken, accessTokenSnapshot?.token, client, nonce]);

  return { status, error, retest };
};

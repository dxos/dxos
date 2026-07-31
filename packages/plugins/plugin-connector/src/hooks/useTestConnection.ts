//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import { useCallback, useState } from 'react';

import { useSpaceCallback } from '@dxos/app-framework/ui';
import * as Credential from '@dxos/compute/Credential';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import { useClient } from '@dxos/react-client';
import { useAsyncEffect } from '@dxos/react-ui';

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

  const testConnection = connector?.testConnection;
  // Wait for the token ref to resolve, and for a db to read its credential from, before probing.
  const db = accessToken && Obj.getDatabase(accessToken);

  // Resolved through the process manager so the connector reads its credential from the same
  // space-scoped `CredentialsService` operations use.
  const runTest = useSpaceCallback(
    db?.spaceId,
    [Credential.CredentialsService],
    () => {
      invariant(testConnection && connection && accessToken, 'Connection test ran without a resolved token.');
      // Exit rather than failure, so a rejected credential is inspected here rather than thrown.
      return Effect.exit(
        testConnection({ accessToken, connection, client }).pipe(Effect.provide(FetchHttpClient.layer)),
      );
    },
    [testConnection, connection, accessToken, client],
  );

  useAsyncEffect(
    async (controller) => {
      if (!connection || !connector) {
        return;
      }
      if (!testConnection) {
        setStatus('unsupported');
        setError(undefined);
        return;
      }
      if (!accessToken || !db) {
        // Reset rather than just return: a probe may already have been running when the token or its
        // database went away, which would otherwise leave the status on 'testing' indefinitely.
        setStatus('idle');
        setError(undefined);
        return;
      }

      setStatus('testing');
      setError(undefined);

      // Service resolution failing rejects rather than yielding an exit; treat it as a failed probe.
      const exit = await runTest().catch(Exit.die);
      if (controller.signal.aborted) {
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
    },
    [connection, connector, testConnection, accessToken, accessTokenSnapshot?.token, db?.spaceId, runTest, nonce],
  );

  return { status, error, retest };
};

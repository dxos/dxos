//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import { useEffect, useState } from 'react';

import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';

import { bindTestAccount } from './bindTestAccount.ts';

/** `'pending'` until the binding lands, then `'bound'`, or the error that stopped it. */
export type TestAccountState = 'pending' | 'bound' | Error;

/**
 * Binds the story's identity to a test account on `hubUrl` once the identity exists (see {@link bindTestAccount}), and
 * reports the binding's state, so a story can hold back controls that reach account-only EDGE services until it is
 * bound, and say why when it never will be.
 */
export const useTestAccount = (hubUrl: string): TestAccountState => {
  const client = useClient();
  const identityDid = useIdentity()?.did;
  const key = identityDid && `${hubUrl} ${identityDid}`;
  // Keyed, so a new client, identity or hub reads as pending until its own binding settles.
  const [result, setResult] = useState<{ client: typeof client; key: string; state: 'bound' | Error }>();
  useEffect(() => {
    if (!key) {
      return;
    }

    const fiber = Effect.runFork(
      bindTestAccount(client, { hubUrl }).pipe(
        Effect.flatMap(() => Effect.sync(() => setResult({ client, key, state: 'bound' }))),
        Effect.catch((error) =>
          Effect.sync(() => {
            log.catch(error);
            setResult({ client, key, state: error });
          }),
        ),
      ),
    );
    return () => {
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, [client, key, hubUrl]);

  return key !== undefined && result?.key === key && result.client === client ? result.state : 'pending';
};

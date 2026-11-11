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

/**
 * Binds the story's identity to a test account on `hubUrl` once the identity exists (see {@link bindTestAccount}), and
 * reports when it is bound, so a story can hold back controls that reach account-only EDGE services until then.
 */
export const useTestAccount = (hubUrl: string): boolean => {
  const client = useClient();
  const identityDid = useIdentity()?.did;
  const key = identityDid && `${hubUrl} ${identityDid}`;
  // Keyed, so a new identity or hub reads as unbound until its own binding lands.
  const [boundKey, setBoundKey] = useState<string>();
  useEffect(() => {
    if (!key) {
      return;
    }

    const fiber = Effect.runFork(
      bindTestAccount(client, { hubUrl }).pipe(
        Effect.flatMap(() => Effect.sync(() => setBoundKey(key))),
        Effect.catch((error) => Effect.sync(() => log.catch(error))),
      ),
    );
    return () => {
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, [client, key, hubUrl]);

  return key !== undefined && boundKey === key;
};

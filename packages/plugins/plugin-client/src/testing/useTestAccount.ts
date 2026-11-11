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
  const [bound, setBound] = useState(false);
  useEffect(() => {
    if (!identityDid) {
      return;
    }

    const fiber = Effect.runFork(
      bindTestAccount(client, { hubUrl }).pipe(
        Effect.flatMap(() => Effect.sync(() => setBound(true))),
        Effect.catch((error) => Effect.sync(() => log.catch(error))),
      ),
    );
    return () => {
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, [client, identityDid, hubUrl]);

  return bound;
};

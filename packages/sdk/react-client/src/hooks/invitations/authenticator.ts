//
// Copyright 2020 DXOS.org
//

import { useEffect, useState, useMemo } from 'react';

import { trigger } from '@dxos/async';
import { InvitationDescriptor } from '@dxos/echo-db';

import { useClient } from '../client';

/**
 * Handles the invitation handshake.
 */
export const useAuthenticator = (invitation: InvitationDescriptor) => {
  const client = useClient();
  const [state, setState] = useState<any>({});
  const hash = invitation ? invitation.hash : '';

  // Memoize these functions by invitation hash.
  const [secretProvider, secretResolver] = useMemo(() => trigger<Buffer>(), [hash]);

  useEffect(() => {
    if (!invitation) {
      return;
    }
    // Use an AbortController to avoid "calling setState on unmounted component" errors.
    const controller = new AbortController();
    const signal = controller.signal;

    async function runEffect () {
      if (invitation.identityKey) {
        // An invitation for this device to join an existing Identity.
        // Join the Identity
        await client.echo.halo.join(invitation, secretProvider);
        if (!signal.aborted) {
          setState({ identity: invitation.identityKey.toString() });
        }
      }
    }

    runEffect().catch(err => {
      console.error(err);
      // TODO(burdon): Doesn't support retry. Provide hint (e.g., should retry/cancel).
      if (!signal.aborted) {
        setState({ error: String(err) });
      }
    });

    return () => {
      controller.abort();
    };
  }, [hash]);

  return [state, secretResolver];
};

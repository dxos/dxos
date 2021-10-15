//
// Copyright 2020 DXOS.org
//

import { useEffect, useState, useMemo } from 'react';

import { trigger } from '@dxos/async';
import { InvitationDescriptor } from '@dxos/echo-db';

import { useClient } from '../client';

/**
 * Implements the Device invitation handshake on the receiver side.
 * @param invitation Invitation descriptor.
 */
export const useAuthenticator = (invitation: InvitationDescriptor) => {
  const client = useClient();
  const [state, setState] = useState<any>({});

  // Memoize these functions by invitation hash.
  const hash = invitation ? invitation.hash : '';
  const [secretProvider, secretResolver] = useMemo(() => trigger<Buffer>(), [hash]);

  useEffect(() => {
    if (!invitation) {
      return;
    }

    // Prevenut unmount error.
    const controller = new AbortController();
    const signal = controller.signal;

    setImmediate(async () => {
      try {
        // An invitation for this device to join an existing Halo.
        if (invitation.identityKey) {
          await client.echo.halo.join(invitation, secretProvider);
          if (!signal.aborted) {
            setState({ identity: invitation.identityKey.toString() });
          }
        }
      } catch (err) {
        // TODO(burdon): Doesn't support retry. Provide hint (e.g., should retry/cancel).
        if (!signal.aborted) {
          setState({ error: String(err) });
        }
      }
    });

    return () => {
      controller.abort();
    };
  }, [hash]);

  return [state, secretResolver];
};

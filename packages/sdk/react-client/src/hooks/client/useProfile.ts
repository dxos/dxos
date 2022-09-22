//
// Copyright 2020 DXOS.org
//

import { useState, useEffect } from 'react';

import { clientServiceBundle } from '@dxos/client-services';
import { useAsyncEffect } from '@dxos/react-async';
import { createProtoRpcPeer } from '@dxos/rpc';
import { createIFramePort } from '@dxos/rpc-tunnel';

import { useClient } from './useClient';

const DEFAULT_HALO_ORIGIN = 'http://localhost:3967';
const IFRAME_ID = '__DXOS_AUTH__';

/**
 * Hook returning DXOS user profile object, renders HALO auth screen if no profile exists yet.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useProfile = (disableHaloLogin = false) => {
  const client = useClient();
  const [profile, setProfile] = useState(() => client.halo.profile);

  useEffect(() => client.halo.subscribeToProfile(() => setProfile(client.halo.profile)), [client]);

  useAsyncEffect(async () => {
    if (disableHaloLogin) {
      return;
    }

    const iframe = document.getElementById(IFRAME_ID);
    if (!profile && !iframe) {
      const iframe = document.createElement('iframe') as HTMLIFrameElement;
      const source = new URL(client.config.get('runtime.client.remoteSource') ?? DEFAULT_HALO_ORIGIN);
      iframe.src = `${source.origin}#/auth/${encodeURIComponent(window.origin)}`;
      iframe.id = IFRAME_ID;
      iframe.setAttribute('style', 'border: 0; position: fixed; top: 0; right: 0; bottom: 0; left: 0; height: 100vh; width: 100vw;');
      document.body.appendChild(iframe);

      const port = createIFramePort({ iframe, origin: source.origin });
      const peer = createProtoRpcPeer({
        requested: {},
        exposed: clientServiceBundle,
        handlers: client.services,
        port
      });
      await peer.open();
    } else if (profile && iframe) {
      iframe.remove();
    }
  }, [profile, disableHaloLogin]);

  return profile;
};

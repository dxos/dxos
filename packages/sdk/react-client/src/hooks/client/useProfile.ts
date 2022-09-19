//
// Copyright 2020 DXOS.org
//

import { useState, useEffect } from 'react';

import { clientServiceBundle } from '@dxos/client';
import { useAsyncEffect } from '@dxos/react-async';
import { createProtoRpcPeer } from '@dxos/rpc';
import { createIframeParentPort } from '@dxos/rpc-tunnel';

import { useClient } from './useClient';

const DEFAULT_HALO_ORIGIN = 'http://localhost:5173';
const IFRAME_ID = 'dxos-halo-auth';

/**
 * Hook returning DXOS user profile object, renders HALO auth screen if no profile exists yet.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useProfile = () => {
  const client = useClient();
  const [profile, setProfile] = useState(() => client.halo.profile);

  useEffect(() => client.halo.subscribeToProfile(() => setProfile(client.halo.profile)), [client]);

  useAsyncEffect(async () => {
    const iframe = document.getElementById(IFRAME_ID);
    if (!profile && !iframe) {
      const iframe = document.createElement('iframe') as HTMLIFrameElement;
      const haloOrigin = client.config.get('runtime.client.singletonSource') ?? DEFAULT_HALO_ORIGIN;
      iframe.src = `${haloOrigin}#/auth/${encodeURIComponent(window.origin)}`;
      iframe.id = IFRAME_ID;
      iframe.setAttribute('style', 'border: 0; position: fixed; top: 0; right: 0; bottom: 0; left: 0; height: 100vh; width: 100vw;');
      document.body.appendChild(iframe);

      const port = createIframeParentPort(iframe, haloOrigin);
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
  }, [profile]);

  return profile;
};

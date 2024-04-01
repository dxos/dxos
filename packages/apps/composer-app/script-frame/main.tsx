//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { types } from '@braneframe/types/proto';
import { ClientServicesProxy } from '@dxos/client/services';
import { ClientProvider } from '@dxos/react-client';
import { createIFramePort } from '@dxos/rpc-tunnel';

// TODO(burdon): The script main frame currently must be part of the vite applications.
//  Import file as resource from package?

const init = async (f: () => Promise<Record<string, any>>) =>
  Object.entries(await f()).reduce<Record<string, any>>((map, [key, module]) => {
    map[key] = module;
    return map;
  }, {});

// @ts-ignore
window.__DXOS_SANDBOX_MODULES__ = await init(async () => ({
  // prettier-ignore
  'react': await import('react'),
  'react-dom/client': await import('react-dom/client'),
  '@dxos/client': await import('@dxos/client'),
  '@dxos/react-client': await import('@dxos/react-client'),
  '@dxos/react-client/echo': await import('@dxos/react-client/echo'),
  '@braneframe/plugin-explorer': await import('@braneframe/plugin-explorer'),
  '@braneframe/types': await import('@braneframe/types'), // TODO(burdon): Make runtime dep?
}));

const code = new URLSearchParams(window.location.hash.slice(1)).get('code');

if (!code) {
  throw new Error('No code provided.');
}

const Component = React.lazy(() => import(/* @vite-ignore */ `data:text/javascript;base64,${btoa(code)}`));

const services = new ClientServicesProxy(
  createIFramePort({
    channel: 'frame',
    origin: '*',
  }),
);

createRoot(document.getElementById('root')!).render(
  <ClientProvider services={() => services} types={types}>
    <div className='flex fixed inset-0'>
      <Component />
    </div>
  </ClientProvider>,
);

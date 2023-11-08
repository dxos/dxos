//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { ClientServicesProxy } from '@dxos/client/services';
import { ClientProvider } from '@dxos/react-client';
import { createIFramePort } from '@dxos/rpc-tunnel';

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
}));

// eslint-disable-next-line no-new-func
const Component = Function('React', "return React.lazy(() => import('@frame/bundle'))")(React);

const services = new ClientServicesProxy(
  createIFramePort({
    channel: 'frame',
    origin: '*',
  }),
);

// TODO(burdon): Error handling.
createRoot(document.getElementById('root')!).render(
  <ClientProvider services={() => services}>
    <div className='flex fixed inset-0'>
      <Component />
    </div>
  </ClientProvider>,
);

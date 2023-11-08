//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { ClientServicesProxy } from '@dxos/client/services';
import { ClientProvider } from '@dxos/react-client';
import { createIFramePort } from '@dxos/rpc-tunnel';

// TODO(burdon): The script main frame currently must be part of the vite applications.
//  Import file as resource from package?


(window as any).__DXOS_SANDBOX_MODULES__ = {
  modules: {
    // prettier-ignore
    'react': await import('react'),
    'react-dom/client': await import('react-dom/client'),
    '@dxos/client': await import('@dxos/client'),
    '@dxos/react-client': await import('@dxos/react-client'),
    '@dxos/react-client/echo': await import('@dxos/react-client/echo'),
    '@braneframe/plugin-explorer': await import('@braneframe/plugin-explorer'),
  },
  resolve: (name: string) => {
    const { modules } = (window as any).__DXOS_SANDBOX_MODULES__;
    if(!modules[name]) {
      throw new Error(`Module not found: ${name}`);
    }
    return modules[name];
  }
}



// eslint-disable-next-line no-new-func
const Component = Function('React', "return React.lazy(() => import('@frame/bundle'))")(React);

const services = new ClientServicesProxy(
  createIFramePort({
    channel: 'frame',
    origin: '*',
  }),
);

createRoot(document.getElementById('root')!).render(
  <ClientProvider services={() => services}>
    <div className='flex fixed inset-0'>
      <Component />
    </div>
  </ClientProvider>,
);

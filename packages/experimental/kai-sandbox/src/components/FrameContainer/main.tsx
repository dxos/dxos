//
// Copyright 2023 DXOS.org
//

/*
import React from 'react';
import { createRoot } from 'react-dom/client';

import { ClientServicesProxy } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';
import { createIFramePort } from '@dxos/rpc-tunnel';

// eslint-disable-next-line no-new-func
const Component = Function('React', "return React.lazy(() => import('@frame/bundle'))")(React);

const reexportModule = (key: string, module: any) => {
  ((window as any).__DXOS_SANDBOX_MODULES__ ??= {})[key] = module;
};

// TODO(dmaretskyi): This can actually be done from the parent window via `iframe.contentWindow`.
reexportModule('react', await import('react'));
reexportModule('react-dom/client', await import('react-dom/client'));
reexportModule('@dxos/client', await import('@dxos/client'));
reexportModule('@dxos/echo-schema', await import('@dxos/echo-schema'));
reexportModule('@dxos/kai-types', await import('@dxos/kai-types'));
reexportModule('@dxos/react-client', await import('@dxos/react-client'));

const port = createIFramePort({
  channel: 'frame',
  origin: '*'
});

const services = new ClientServicesProxy(port);

createRoot(document.getElementById('root')!).render(
  <div className='flex w-full h-full'>
    <ClientProvider services={() => services}>
      <Component />
    </ClientProvider>
  </div>
);
*/

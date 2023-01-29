//
// Copyright 2023 DXOS.org
//

import { Client } from '@dxos/client';
import { ClientServicesProxy } from '@dxos/client-services';
import { ClientProvider } from '@dxos/react-client';
import { createIFramePort } from '@dxos/rpc-tunnel';
import React from 'react';
import { createRoot } from 'react-dom/client';

console.log('frame main');

// eslint-disable-next-line no-new-func
const Component = Function('React', "return React.lazy(() => import('@frame/bundle'))")(React);

// TODO(dmaretskyi): This can actually be done from the parent window via `iframe.contentWindow`.
reexportModule('react', await import('react'));
reexportModule('react-dom', await import('react-dom'));
reexportModule('@dxos/client', await import('@dxos/client'));
reexportModule('@dxos/react-client', await import('@dxos/react-client'));

const port = createIFramePort({
  channel: 'frame',
  origin: '*'
})

const services = new ClientServicesProxy(port);

createRoot(document.getElementById('root')!).render(
  <div>
    <ClientProvider services={() => services}>
      <Component />
    </ClientProvider>
  </div>
);

function reexportModule(key: string, module: any) {
  ((window as any).__DXOS_FRAMEBOX_MODULES ??= {})[key] = module;
}
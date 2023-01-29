//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

console.log('frame main');

// eslint-disable-next-line no-new-func
const Component = Function('React', "return React.lazy(() => import('@frame/bundle'))")(React);

// TODO(dmaretskyi): This can actually be done from the parent window via `iframe.contentWindow`.
reexportModule('react', await import('react'));
reexportModule('react-dom', await import('react-dom'));

createRoot(document.getElementById('root')!).render(
  <div>
    <Component />
  </div>
);

function reexportModule(key: string, module: any) {
  ((window as any).__DXOS_FRAMEBOX_MODULES ??= {})[key] = module;
}
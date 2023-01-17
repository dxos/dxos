//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

console.log('frame main');

// eslint-disable-next-line no-new-func
const Component = Function('React', "return React.lazy(() => import('@frame/bundle'))")(React);

createRoot(document.getElementById('root')!).render(
  <div>
    <Component />
  </div>
);

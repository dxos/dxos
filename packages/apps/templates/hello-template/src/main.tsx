//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';

// TODO(wittjosiah): This template should hide fewer details inside appkit and follow more of a tutorial structure.
//   It will be easier to do this in a concise way once identity and sharing controls are embeddable from HALO.

createRoot(document.getElementById('root')!).render(<App />);

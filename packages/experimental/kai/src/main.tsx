//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import '@dxosTheme';

import '../style.css';

// TODO(burdon): Must be at the top-level for vite.
import { Root } from './Root';

createRoot(document.getElementById('root')!).render(<Root />);

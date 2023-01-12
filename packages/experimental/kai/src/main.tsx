//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { Root } from './Root';

import '@dxosTheme';
import '../style.css';

createRoot(document.getElementById('root')!).render(<Root />);

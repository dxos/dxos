//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import '@dxosTheme';

import '../style.css';

import { Root } from './app/PWARoot';

createRoot(document.getElementById('root')!).render(<Root />);

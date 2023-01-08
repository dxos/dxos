//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

// include any css files directly
import 'index.css';

import { App } from './App';

createRoot(document.getElementById('root')!).render(<App />);

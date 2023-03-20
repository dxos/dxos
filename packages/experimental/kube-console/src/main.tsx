//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { Main } from './containers';

import '@dxosTheme';

import '@dxos/client/shell.css';
import '../style.css';
import 'virtual:fonts.css';

// TODO(burdon): Theme.
// TODO(burdon): Pluggable modules (panels).
// TODO(burdon): Separate API from modules.
// TODO(burdon): Mobile first.
// TODO(burdon): HALO credentials (initially just HALO identity). Client.

const root = createRoot(document.getElementById('root')!);
root.render(<Main />);

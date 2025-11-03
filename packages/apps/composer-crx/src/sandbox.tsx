//
// Copyright 2024 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { log } from '@dxos/log';

const Root = () => <div>Sandbox</div>;

const main = async () => {
  log.info('sandbox');
  createRoot(document.getElementById('root')!).render(<Root />);
};

void main();

//
// Copyright 2024 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { log } from '@dxos/log';

const Root = () => <div>Panel</div>;

const main = async () => {
  log.info('panel');
  createRoot(document.getElementById('root')!).render(<Root />);
};

void main();

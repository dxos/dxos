//
// Copyright 2026 DXOS.org
//

import { realm } from '#realm';

import data from './data.json';
import { label } from './label.ts';

// A worker entry: `#realm` resolves with the worker condition here.
(globalThis as { workerRealm?: string }).workerRealm = `${label}:${data.name}:${realm}`;

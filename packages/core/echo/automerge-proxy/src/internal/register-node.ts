//
// Copyright 2026 DXOS.org
//

// Node holds Automerge documents wherever it runs ECHO, so importing the namespace there registers
// Automerge and tests and tools need no setup.

import * as Automerge from '@automerge/automerge';

import { register } from './registry.ts';

register(Automerge);

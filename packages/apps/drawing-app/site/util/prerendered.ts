//
// Copyright 2026 DXOS.org
//

import path from 'node:path';

import { type Prerendered, prerender } from '../../src/landing/prerender.ts';

/** The editor's and the relations' drawings, rendered once per build from the package's `src/landing/diagrams`. */
export const prerendered = (): Promise<Prerendered> => prerender(path.resolve('src/landing/diagrams'));

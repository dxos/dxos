//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import * as BrainSurface from '@dxos/plugin-brain/BrainSurface';

/** The extracted-facts panel — plugin-brain's standalone per-space facts surface (resolves the active space itself). */
export const FactsModule = () => <Surface.Surface type={BrainSurface.Facts} limit={1} />;

//
// Copyright 2026 DXOS.org
//

import { Capabilities, Capability, Surface } from '@dxos/app-framework';

export const ReactSurface = () =>
  Capability.contributes(Capabilities.ReactSurface, [
    Surface.create({
      id: 'surface.fixture-card',
      role: 'card',
    }),
    Surface.create({
      id: 'surface.fixture-article',
      role: ['article', 'section'],
    }),
  ]);

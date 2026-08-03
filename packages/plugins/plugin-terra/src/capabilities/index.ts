//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const CreateObject = Capability.lazy('CreateObject', () => import('./create-object'));
export const PlanetCache = Capability.lazy('PlanetCache', () => import('./planet-cache'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));

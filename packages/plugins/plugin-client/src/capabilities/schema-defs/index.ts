//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const SchemaDefs = Capability.lazy('SchemaDefs', () => import('./schema-defs'));


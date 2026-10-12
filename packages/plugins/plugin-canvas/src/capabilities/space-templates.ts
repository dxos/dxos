//
// Copyright 2026 DXOS.org
//

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { ArchitectureSpace } from '../samples/architecture/index.ts';

export default [ArchitectureSpace.makeTemplate()] satisfies ReadonlyArray<AppCapabilities.SpaceTemplate>;

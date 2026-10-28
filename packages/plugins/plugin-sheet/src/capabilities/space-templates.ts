//
// Copyright 2026 DXOS.org
//

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { SalesSpace } from '../samples/sales/index.ts';

export default [SalesSpace.makeTemplate()] satisfies ReadonlyArray<AppCapabilities.SpaceTemplate>;

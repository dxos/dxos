//
// Copyright 2026 DXOS.org
//

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { MacroSpace } from '../samples/macro/index.ts';

export default [MacroSpace.makeTemplate()] satisfies ReadonlyArray<AppCapabilities.SpaceTemplate>;

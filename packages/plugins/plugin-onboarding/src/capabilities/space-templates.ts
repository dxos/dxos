//
// Copyright 2026 DXOS.org
//

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import * as BrambleSpace from '../samples/bramble/BrambleSpace.ts';

export default [BrambleSpace.makeTemplate()] satisfies ReadonlyArray<AppCapabilities.SpaceTemplate>;

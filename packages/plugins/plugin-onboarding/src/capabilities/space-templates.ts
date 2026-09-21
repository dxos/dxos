//
// Copyright 2026 DXOS.org
//

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import * as BrambleSpace from '../samples/bramble/BrambleSpace.ts';

/**
 * The Bramble Coffee Roasters template. Loaded only once something asks for the list — the world and
 * the builder ride this module's chunk, which is what keeps them off every session's boot path.
 *
 * First launch applies this same template rather than importing a pre-built archive, so the content
 * has one source: the phases under `src/samples/bramble/`.
 */
export default [BrambleSpace.makeTemplate()] satisfies ReadonlyArray<AppCapabilities.SpaceTemplate>;

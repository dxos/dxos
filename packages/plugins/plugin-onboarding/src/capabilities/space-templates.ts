//
// Copyright 2026 DXOS.org
//

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

import { BRAMBLE_TEMPLATE_ID } from '../constants.ts';
import * as BrambleSpace from '../samples/BrambleSpace.ts';

/**
 * The Bramble Coffee Roasters template. Loaded only once something asks for the list — the world and
 * the builder ride this module's chunk, which is what keeps them off every session's boot path.
 *
 * First launch applies this same template rather than importing a pre-built archive, so the content
 * has one source: the phases under `src/samples/`.
 */
export default [
  SampleSpace.makeTemplate({
    id: BRAMBLE_TEMPLATE_ID,
    label: 'Bramble Coffee Roasters',
    description: 'A coffee roastery mid-launch: its people, mail, calendar, tasks, notes and roast logs.',
    definition: BrambleSpace.make(),
  }),
] satisfies ReadonlyArray<AppCapabilities.SpaceTemplate>;

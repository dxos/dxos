//
// Copyright 2026 DXOS.org
//

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import type * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';

import { BRAMBLE_TEMPLATE_ID } from '../constants.ts';
import { BrambleSpace } from '../sample/index.ts';

/**
 * The Bramble Coffee Roasters template. Loaded only once something asks for the list — the world and
 * the builder ride this module's chunk, which is what keeps them off every session's boot path.
 *
 * First launch applies this same template rather than importing a pre-built archive, so the content
 * has one source: the phases under `src/sample/`.
 */
export default [
  SampleSpace.preset({
    id: BRAMBLE_TEMPLATE_ID,
    label: 'Bramble Coffee Roasters',
    description: 'A coffee roastery mid-launch: its people, mail, calendar, tasks, notes and roast logs.',
    definition: BrambleSpace(),
  }),
] satisfies ReadonlyArray<SpaceCapabilities.SpaceTemplate>;

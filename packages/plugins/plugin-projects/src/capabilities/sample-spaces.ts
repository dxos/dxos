//
// Copyright 2026 DXOS.org
//

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

import { TidepoolSpace } from '../sample';

/**
 * The sample spaces this plugin offers. Loaded only once something asks for the list — the content
 * and the builder ride this module's chunk, not the plugin definition's.
 */
export default [
  SampleSpace.preset({
    id: 'org.dxos.plugin-projects.sample.tidepool',
    label: 'Tidepool — Offline sync v2',
    description: 'A work-stream with a two-level task tree, a .mdl spec, an architecture note and a decision log.',
    definition: TidepoolSpace(),
  }),
] satisfies ReadonlyArray<AppCapabilities.SampleSpace>;

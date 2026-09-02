//
// Copyright 2026 DXOS.org
//

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

import { PipelineSpace } from '../sample';

/**
 * The sample spaces this plugin offers. Loaded only once something asks for the list — the content
 * and the builder ride this module's chunk, not the plugin definition's.
 */
export default [
  SampleSpace.preset({
    id: 'org.dxos.plugin-crm.sample.pipeline',
    label: 'Northwind Sales',
    description: 'Seven accounts across the pipeline stages, a contact each, and the mail behind them.',
    definition: PipelineSpace(),
  }),
] satisfies ReadonlyArray<AppCapabilities.SampleSpace>;

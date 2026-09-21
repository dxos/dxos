//
// Copyright 2026 DXOS.org
//

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import {
  IncidentSpace,
  PipelineSpace,
  StockfishSpace,
  TidepoolSpace,
  WeatherSpace,
  WorkerSpace,
} from '../samples/index.ts';

/**
 * The space templates this plugin offers, each one a sample space offering itself. Loaded only once
 * something asks for the list — the content and the builder ride this module's chunk, not the
 * plugin definition's.
 *
 * The samples live here rather than in the plugins whose types they use: the content is a debugging
 * aid, and every consumer of it (the generator panel, the create-space dialog) is this plugin's.
 */
export default [
  PipelineSpace.makeTemplate(),
  TidepoolSpace.makeTemplate(),
  StockfishSpace.makeTemplate(),
  WorkerSpace.makeTemplate(),
  WeatherSpace.makeTemplate(),
  IncidentSpace.makeTemplate(),
] satisfies ReadonlyArray<AppCapabilities.SpaceTemplate>;

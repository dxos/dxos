//
// Copyright 2026 DXOS.org
//

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import {
  IncidentSpace,
  PipelineSpace,
  PluginSpace,
  ReviewSpace,
  StockfishSpace,
  TidepoolSpace,
  WeatherSpace,
  WorkerSpace,
} from '../samples/index.ts';

export default [
  PipelineSpace.makeTemplate(),
  TidepoolSpace.makeTemplate(),
  StockfishSpace.makeTemplate(),
  WorkerSpace.makeTemplate(),
  WeatherSpace.makeTemplate(),
  PluginSpace.makeTemplate(),
  IncidentSpace.makeTemplate(),
  ReviewSpace.makeTemplate(),
] satisfies ReadonlyArray<AppCapabilities.SpaceTemplate>;

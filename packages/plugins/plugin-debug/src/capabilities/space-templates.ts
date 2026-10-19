//
// Copyright 2026 DXOS.org
//

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import {
  ChessClubSpace,
  FieldstoneSpace,
  IncidentSpace,
  PipelineSpace,
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
  IncidentSpace.makeTemplate(),
  ReviewSpace.makeTemplate(),
  FieldstoneSpace.makeTemplate(),
  ChessClubSpace.makeTemplate(),
] satisfies ReadonlyArray<AppCapabilities.SpaceTemplate>;

//
// Copyright 2026 DXOS.org
//

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import {
  CommunitySpace,
  DemoSpace,
  FieldstoneSpace,
  IncidentSpace,
  PipelineSpace,
  PresenterSpace,
  ReviewSpace,
  StockfishSpace,
  TidepoolSpace,
  TimelineSpace,
  WeatherSpace,
  WorkerSpace,
} from '../samples/index.ts';

export default [
  PipelineSpace.makeTemplate(),
  TidepoolSpace.makeTemplate(),
  StockfishSpace.makeTemplate(),
  WorkerSpace.makeTemplate(),
  WeatherSpace.makeTemplate(),
  CommunitySpace.makeTemplate(),
  IncidentSpace.makeTemplate(),
  ReviewSpace.makeTemplate(),
  FieldstoneSpace.makeTemplate(),
  DemoSpace.makeTemplate(),
  PresenterSpace.makeTemplate(),
  TimelineSpace.makeTemplate(),
] satisfies ReadonlyArray<AppCapabilities.SpaceTemplate>;

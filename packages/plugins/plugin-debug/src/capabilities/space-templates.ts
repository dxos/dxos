//
// Copyright 2026 DXOS.org
//

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import {
  AvailabilityPollSpace,
  DemoSpace,
  FieldstoneSpace,
  IncidentSpace,
  PipelineSpace,
  PresenterSpace,
  ReviewSpace,
  RideCheckSpace,
  StockfishSpace,
  TidepoolSpace,
  TimelineSpace,
  TriageSpace,
  WeatherSpace,
  WorkerSpace,
} from '../samples/index.ts';

export default [
  PipelineSpace.makeTemplate(),
  TidepoolSpace.makeTemplate(),
  StockfishSpace.makeTemplate(),
  RideCheckSpace.makeTemplate(),
  AvailabilityPollSpace.makeTemplate(),
  WorkerSpace.makeTemplate(),
  WeatherSpace.makeTemplate(),
  IncidentSpace.makeTemplate(),
  ReviewSpace.makeTemplate(),
  FieldstoneSpace.makeTemplate(),
  DemoSpace.makeTemplate(),
  PresenterSpace.makeTemplate(),
  TimelineSpace.makeTemplate(),
  TriageSpace.makeTemplate(),
] satisfies ReadonlyArray<AppCapabilities.SpaceTemplate>;

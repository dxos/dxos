//
// Copyright 2025 DXOS.org

import { Layer, pipe } from 'effect';

import { ClientService, ConfigService } from '../services';

import { TestConsole } from './test-console';

export const TestLayer = pipe(
  ClientService.layer,
  Layer.provideMerge(ConfigService.layerMemory),
  Layer.provideMerge(TestConsole.layer),
);

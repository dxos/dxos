//
// Copyright 2025 DXOS.org

import { Layer, pipe } from 'effect';

import { ClientService, ConfigService } from '../services';

import { TestLogger } from './test-logger';

export const testLayer = (testLogger: TestLogger) =>
  // prettier-ignore
  pipe(
    ClientService.layer,
    Layer.provide(ConfigService.layerMemory),
    Layer.provide(TestLogger.layer(testLogger)),
  );

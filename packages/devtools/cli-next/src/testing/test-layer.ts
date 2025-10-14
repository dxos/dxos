//
// Copyright 2025 DXOS.org

import * as Layer from 'effect/Layer';
import * as pipe from 'effect/pipe';

import { ClientService, CommandConfig, ConfigService } from '../services';

import { TestConsole } from './test-console';

export const TestLayer = pipe(
  ClientService.layer,
  Layer.provideMerge(ConfigService.layerMemory),
  Layer.provideMerge(TestConsole.layer),
  Layer.provideMerge(CommandConfig.layerTest),
);

//
// Copyright 2025 DXOS.org

import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';

import { ClientService, ConfigService } from '@dxos/client';

import { CommandConfig } from '../services';

import { TestConsole } from './test-console';

export const TestLayer = Function.pipe(
  ClientService.layer,
  Layer.provideMerge(ConfigService.layerMemory),
  Layer.provideMerge(TestConsole.layer),
  Layer.provideMerge(CommandConfig.layerTest),
);

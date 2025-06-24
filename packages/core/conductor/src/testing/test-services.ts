//
// Copyright 2025 DXOS.org
//

import { FetchHttpClient } from '@effect/platform';
import { Layer, type Context, type Scope } from 'effect';

import { type EdgeClient, type EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { type QueueFactory } from '@dxos/echo-db';

import { consoleLogger, noopLogger } from './logger';
import { EventLogger, FunctionCallService } from '../services';
import { AiService, DatabaseService, QueueService } from '@dxos/functions';
import type { ComputeRequirements } from '../types';
import type { AiServiceClient } from '@dxos/ai';

export type TestServiceOptions = {
  ai?: AiServiceClient;
  // TODO(burdon): Create common interface for EdgeClient and EdgeHttpClient?
  edgeClient?: EdgeClient;
  edgeHttpClient?: EdgeHttpClient;
  queueFactory?: QueueFactory;
  enableLogging?: boolean;
  logger?: Context.Tag.Service<EventLogger>;
};

export const testServices = ({
  ai,
  edgeClient,
  edgeHttpClient,
  queueFactory,
  enableLogging = false,
  logger = enableLogging ? consoleLogger : noopLogger,
}: TestServiceOptions = {}): Layer.Layer<Exclude<ComputeRequirements, Scope.Scope>> => {
  invariant((edgeClient != null) === (edgeHttpClient != null), 'specify both or none of edgeClient and edgeHttpClient');

  const logLayer = Layer.succeed(EventLogger, logger);
  const edgeClientLayer =
    queueFactory != null
      ? Layer.succeed(QueueService, { queues: queueFactory, contextQueue: undefined })
      : QueueService.notAvailable;

  const aiLayer =
    ai != null
      ? Layer.succeed(AiService, {
          get client() {
            return ai;
          },
        })
      : AiService.notAvailable;
  const databaseLayer = DatabaseService.notAvailable;
  const functionCallServiceLayer = Layer.succeed(FunctionCallService, FunctionCallService.mock());
  return Layer.mergeAll(
    logLayer,
    edgeClientLayer,
    aiLayer,
    databaseLayer,
    FetchHttpClient.layer,
    functionCallServiceLayer,
  );
};

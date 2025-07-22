//
// Copyright 2025 DXOS.org
//

import { Layer } from 'effect';
import { useMemo } from 'react';
import { useDeepCompareMemo } from 'use-deep-compare-effect';

import { type AiService, ToolRegistry } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { Capabilities, useCapabilities } from '@dxos/app-framework';
import { type Space } from '@dxos/client/echo';
import {
  ConfiguredCredentialsService,
  CredentialsService,
  DatabaseService,
  EventLogger,
  FunctionCallService,
  QueueService,
  ToolResolverService,
  TracingService,
} from '@dxos/functions';

export type UseServicesProps = {
  space?: Space;
};

export type Services =
  | AiService
  | CredentialsService
  | DatabaseService
  | QueueService
  | FunctionCallService
  | ToolResolverService
  | TracingService
  | EventLogger;

/**
 * Construct service layer.
 */
// TODO(burdon): Deconstruct into separate layers?
export const useServices = ({ space }: UseServicesProps): Layer.Layer<Services> | undefined => {
  const toolRegistry = useToolRegistry();

  return useMemo(() => {
    return Layer.mergeAll(
      AiServiceTestingPreset('direct').pipe(Layer.orDie), // TODO(burdon): !!!
      Layer.succeed(CredentialsService, new ConfiguredCredentialsService()),
      space ? Layer.succeed(DatabaseService, DatabaseService.make(space.db)) : DatabaseService.notAvailable,
      space ? Layer.succeed(QueueService, QueueService.make(space.queues)) : QueueService.notAvailable,
      Layer.succeed(FunctionCallService, FunctionCallService.mock()),
      Layer.succeed(ToolResolverService, ToolResolverService.make(toolRegistry)),
      Layer.succeed(TracingService, TracingService.noop),
      Layer.succeed(EventLogger, EventLogger.noop),
    );
  }, [space, toolRegistry]);
};

// TODO(burdon): Factor out.
const useToolRegistry = (): ToolRegistry => {
  const tools = useCapabilities(Capabilities.Tools).flat();
  return useDeepCompareMemo(() => {
    const toolRegistry = new ToolRegistry([]);
    for (const tool of tools) {
      if (!toolRegistry.has(tool)) {
        toolRegistry.register(tool);
      }
    }
    return toolRegistry;
  }, [tools]);
};

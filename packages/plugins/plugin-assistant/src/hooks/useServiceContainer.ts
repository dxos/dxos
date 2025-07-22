//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { ToolRegistry, AiService } from '@dxos/ai';
import { Capabilities, useCapabilities, useCapability } from '@dxos/app-framework';
import { DatabaseService, QueueService, ServiceContainer, ToolResolverService } from '@dxos/functions';
import { type Space } from '@dxos/react-client/echo';

import { AssistantCapabilities } from '../capabilities';

interface UseServiceContainerProps {
  space?: Space;
}

export const useServiceContainer = ({ space }: UseServiceContainerProps) => {
  const aiClient = useCapability(AssistantCapabilities.AiClient);
  const tools = useCapabilities(Capabilities.Tools).flat();

  const [toolRegistry] = useState(() => new ToolRegistry([]));
  useEffect(() => {
    for (const tool of tools) {
      if (!toolRegistry.has(tool)) {
        toolRegistry.register(tool);
      }
    }
  }, [toolRegistry, JSON.stringify(tools.map((tool) => tool.id))]);

  return useMemo(
    () =>
      new ServiceContainer().setServices({
        ai: AiService.make(aiClient.value),
        database: space ? DatabaseService.make(space.db) : undefined,
        queues: space ? QueueService.make(space.queues, undefined) : undefined,
        // eventLogger: consoleLogger,
        toolResolver: ToolResolverService.make(toolRegistry),
      }),
    [space, aiClient],
  );
};

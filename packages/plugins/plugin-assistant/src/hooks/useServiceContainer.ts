import { ToolRegistry } from '@dxos/ai';
import { useCapability } from '@dxos/app-framework';
import { AiService, DatabaseService, QueueService, ServiceContainer, ToolResolverService } from '@dxos/functions';
import { type Space } from '@dxos/react-client/echo';
import { AssistantCapabilities } from '../capabilities';
import { useMemo } from 'react';

interface UseServiceContainerProps {
  space?: Space;
}

export const useServiceContainer = ({ space }: UseServiceContainerProps) => {
  const aiClient = useCapability(AssistantCapabilities.AiClient);

  return useMemo(
    () =>
      new ServiceContainer().setServices({
        ai: AiService.make(aiClient.value),
        database: space ? DatabaseService.make(space.db) : undefined,
        queues: space ? QueueService.make(space.queues, undefined) : undefined,
        // eventLogger: consoleLogger,
        toolResolver: ToolResolverService.make(
          new ToolRegistry([
            // TODO(dmaretskyi): Add tools here.
          ]),
        ),
      }),
    [space, aiClient],
  );
};

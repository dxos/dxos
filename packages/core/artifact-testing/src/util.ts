//
// Copyright 2025 DXOS.org
//


import { createTool, ToolResult, type ExecutableTool } from '@dxos/ai';
import {
  FunctionExecutor,
  type FunctionDefinition,
  type ServiceContainer
} from '@dxos/functions';

declare global {
  interface ToolContextExtensions {
    serviceContainer?: ServiceContainer;
  }
}

// TODO(dmaretskyi): Find a good home for this.
export const toolFromFunction = <I, O>(namespace: string, name: string, func: FunctionDefinition<I, O>): ExecutableTool => {
  return createTool(namespace, {
    name,
    description: func.description,
    schema: func.inputSchema,
    execute: async (input, { extensions }) => {
      const serviceContainer = extensions?.serviceContainer;
      if (!serviceContainer) {
        throw new Error('Service container not provided.');
      }

      const invoker = new FunctionExecutor(serviceContainer);
      try {
        const result = await invoker.invoke(func, input);
        return ToolResult.Success(result);
      } catch (error) {
        return ToolResult.Error(error instanceof Error ? error.message : 'Unknown error.');
      }
    },
  });
};
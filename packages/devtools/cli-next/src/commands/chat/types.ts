//
// Copyright 2025 DXOS.org
//

import { type AiModelResolver, type AiService, type ToolExecutionService, type ToolResolverService } from '@dxos/ai';
import { type Database } from '@dxos/echo';
import {
  type CredentialsService,
  type FunctionInvocationService,
  type QueueService,
  type TracingService,
} from '@dxos/functions';

// TODO(burdon): Factor out (see plugin-assistant/processor.ts)
export type AiChatServices =
  | AiModelResolver.AiModelResolver
  | AiService.AiService
  | CredentialsService
  | Database.Service
  | FunctionInvocationService
  | QueueService
  | ToolExecutionService
  | ToolResolverService
  | TracingService;

export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: Date;
};

/**
 * Create a user message.
 */
export const createUserMessage = (content: string): Message => ({
  id: `user-${Date.now()}`,
  role: 'user',
  content,
  timestamp: new Date(),
});

/**
 * Create an empty assistant message placeholder.
 */
export const createAssistantMessage = (): Message => ({
  id: `assistant-${Date.now()}`,
  role: 'assistant',
  content: '',
  timestamp: new Date(),
});

/**
 * Create an error message.
 */
export const createErrorMessage = (error: unknown): Message => ({
  id: `error-${Date.now()}`,
  role: 'error',
  content: `Error: ${String(error)}`,
  timestamp: new Date(),
});

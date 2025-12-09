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

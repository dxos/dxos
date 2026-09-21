//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { ClaudeAgentSession, ClaudeManagedAgent } from '#types';

export const Schema = AppCapability.schema([
  ClaudeManagedAgent.ClaudeManagedAgent,
  ClaudeAgentSession.ClaudeAgentSession,
]);

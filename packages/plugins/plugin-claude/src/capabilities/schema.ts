//
// Copyright 2026 DXOS.org
//

import { ClaudeAgentSession, ClaudeManagedAgent } from '#types';

/** Schemas this plugin registers; a separate module so they stay out of the plugin body's graph. */
export default [ClaudeManagedAgent.ClaudeManagedAgent, ClaudeAgentSession.ClaudeAgentSession];

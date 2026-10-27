//
// Copyright 2025 DXOS.org
//

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import type * as AgentIdentity from './AgentIdentity.ts';

/**
 * Test/storybook hosts swap in a stub agent runner and identity via these options; `AgentIdentity` is a singleton
 * capability, so a second provider would trip the duplicate-provider check.
 */
export type ReviewPluginOptions = {
  agentRunner?: AppCapabilities.CommentAgentRunner;
  agentIdentity?: AgentIdentity.AgentIdentity;
};

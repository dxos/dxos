//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';

import * as CloudflareOsAgent from '../agent/CloudflareOsAgent.ts';

/** The bound workspace's agent, offered beside Composer's own agent and Claude Code in every chat. */
export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(AssistantCapabilities.Agent, CloudflareOsAgent.agent)),
);

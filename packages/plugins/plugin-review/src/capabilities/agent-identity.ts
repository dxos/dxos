//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { AgentIdentity } from '#types';

import type { ReviewPluginOptions } from '../types/ReviewPluginOptions.ts';

export default Capability.makeModule((options: ReviewPluginOptions) =>
  Effect.succeed([
    Capability.contribute(AgentIdentity.AgentIdentity, options.agentIdentity ?? AgentIdentity.DEFAULT_AGENT_IDENTITY),
  ]),
);

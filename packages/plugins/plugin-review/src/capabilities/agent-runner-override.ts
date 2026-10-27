//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import type { ReviewPluginOptions } from '../types/ReviewPluginOptions.ts';

export default Capability.makeModule(({ agentRunner }: ReviewPluginOptions) =>
  Effect.succeed(agentRunner ? [Capability.contribute(AppCapabilities.CommentAgentRunner, agentRunner)] : []),
);

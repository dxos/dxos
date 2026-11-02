//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { SpaceOperationConfig } from '../operations/helpers.ts';
import type * as SpaceSchema from '../types/SpaceSchema.ts';
import { makeCreateInvitationUrl, makeCreateJoinUrl, makeCreateObjectUrl } from './helpers.ts';

export default Capability.makeModule((options: SpaceSchema.SpacePluginOptions) =>
  Effect.succeed(
    Capability.contribute(SpaceOperationConfig, {
      createInvitationUrl: makeCreateInvitationUrl(options),
      createJoinUrl: makeCreateJoinUrl(options),
      createObjectUrl: makeCreateObjectUrl(options),
    }),
  ),
);

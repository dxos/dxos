//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { SpaceOperationConfig } from '../operations/helpers.ts';

export default Capability.makeModule((config: SpaceOperationConfig) =>
  Effect.succeed(Capability.contribute(SpaceOperationConfig, config)),
);

//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { ProjectCapabilities, SpecText } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(ProjectCapabilities.SpecCodec, SpecText.codec)),
);

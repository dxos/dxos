//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Hooks from '@dxos/react-ui/Hooks';

import { StackCapabilities } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(StackCapabilities.SectionHeights, Hooks.createHeightMemory())),
);

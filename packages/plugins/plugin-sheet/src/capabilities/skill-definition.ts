//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { SheetSkill } from '#skills';

export default Capability.makeModule(() =>
  Effect.succeed(Capability.provide(AppCapabilities.SkillDefinition, SheetSkill)),
);

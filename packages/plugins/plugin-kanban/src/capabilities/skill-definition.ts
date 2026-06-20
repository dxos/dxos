//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { KanbanSkill } from '#skills';

// NOTE: Explicit annotation required: d.ts emit cannot portably name the inferred @dxos/compute types (TS2883).
const skillDefinition: () => Effect.Effect<
  Capability.Capability<typeof AppCapabilities.SkillDefinition>[],
  never,
  Capability.Service
> = () => Effect.succeed([Capability.contributes(AppCapabilities.SkillDefinition, KanbanSkill)]);

export default skillDefinition;

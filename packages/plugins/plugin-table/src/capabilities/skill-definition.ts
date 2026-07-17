//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
import type { Skill } from '@dxos/compute';

import { TableSkill } from '#skills';

// TODO(wittjosiah): Remove? All table ops other than resizing columns are more generically handled as schema ops.
const skillDefinition = () => Effect.succeed([Capability.provide(AppCapabilities.SkillDefinition, TableSkill)]);

export default skillDefinition;

//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { TableSkill } from '#skills';

// TODO(wittjosiah): Remove? All table ops other than resizing columns are more generically handled as schema ops.
const skillDefinition = () => Effect.succeed([Capability.contributes(AppCapabilities.SkillDefinition, TableSkill)]);

export default skillDefinition;

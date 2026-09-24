//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { TableSkill } from '#skills';

// TODO(wittjosiah): Remove? All table ops other than resizing columns are more generically handled as schema ops.
export const SkillDefinition = AppCapability.skillDefinition(
  () => Effect.succeed([Capability.contribute(AppCapabilities.SkillDefinition, TableSkill)]),
  {
    environments: ['node'],
  },
);

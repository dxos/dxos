//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { CommentSkill } from '#skills';

export const SkillDefinition = AppCapability.skillDefinition(
  () => Effect.succeed([Capability.contribute(AppCapabilities.SkillDefinition, CommentSkill)]),
  {
    environments: ['node'],
  },
);

//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { CommentSkill } from '#skills';

const skillDefinition = () => Effect.succeed([Capability.contribute(AppCapabilities.SkillDefinition, CommentSkill)]);

export default skillDefinition;

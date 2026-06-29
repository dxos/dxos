//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { CalendarSkill, InboxSendSkill, InboxSkill } from '#skills';

const skillDefinition = () =>
  Effect.succeed([
    Capability.contributes(AppCapabilities.SkillDefinition, InboxSkill),
    Capability.contributes(AppCapabilities.SkillDefinition, InboxSendSkill),
    Capability.contributes(AppCapabilities.SkillDefinition, CalendarSkill),
  ]);

export default skillDefinition;

//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { CalendarSkill, InboxSendSkill, InboxSkill } from '#skills';

const skillDefinition = () =>
  Effect.succeed([
    Capability.provide(AppCapabilities.SkillDefinition, InboxSkill),
    Capability.provide(AppCapabilities.SkillDefinition, InboxSendSkill),
    Capability.provide(AppCapabilities.SkillDefinition, CalendarSkill),
  ]);

export default skillDefinition;

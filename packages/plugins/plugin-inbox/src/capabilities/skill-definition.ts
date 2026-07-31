//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { CalendarSkill, InboxSendSkill, InboxSkill } from '#skills';

const skillDefinition = () =>
  Effect.succeed([
    Capability.contributeAll(AppCapabilities.SkillDefinition, [InboxSkill, InboxSendSkill, CalendarSkill]),
  ]);

export default skillDefinition;

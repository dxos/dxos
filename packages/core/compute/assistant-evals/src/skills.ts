//
// Copyright 2026 DXOS.org
//

import * as ChatContextSkill from '@dxos/assistant-toolkit/ChatContextSkill';
import * as SkillManagerSkill from '@dxos/assistant-toolkit/SkillManagerSkill';
import type * as Skill from '@dxos/compute/Skill';
import { Ref } from '@dxos/echo';

export const getDefaultSkills = (): Ref.Ref<Skill.Skill>[] => [
  Ref.make(SkillManagerSkill.make()),
  Ref.make(ChatContextSkill.make()),
];

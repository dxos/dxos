//
// Copyright 2026 DXOS.org
//

import { ChatContextSkill, SkillManagerSkill } from '@dxos/assistant-toolkit';
import type * as Skill from '@dxos/compute/Skill';
import { Ref } from '@dxos/echo';

export const getDefaultSkills = (): Ref.Ref<Skill.Skill>[] => [
  Ref.make(SkillManagerSkill.make()),
  Ref.make(ChatContextSkill.make()),
];

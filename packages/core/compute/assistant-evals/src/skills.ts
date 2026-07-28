//
// Copyright 2026 DXOS.org
//

import { DatabaseSkill, SkillManagerSkill } from '@dxos/assistant-toolkit';
import { type Skill } from '@dxos/compute';
import { Ref } from '@dxos/echo';

export const getDefaultSkills = (): Ref.Ref<Skill.Skill>[] => [
  Ref.make(SkillManagerSkill.make()),
  Ref.make(DatabaseSkill.make()),
];

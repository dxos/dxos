//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as Skill from '@dxos/compute/Skill';

import { PresenterSkill } from '#skills';
import { Presentation } from '#types';

describe('PresenterSkill', () => {
  test('builds with its key, so the Presentation type can enable it', () => {
    const skill = PresenterSkill.make();
    expect(Skill.getKey(skill)).toBe(Presentation.SKILL_KEY);
    expect(PresenterSkill.key).toBe(Presentation.SKILL_KEY);
    expect(skill.tools).toHaveLength(5);
  });
});

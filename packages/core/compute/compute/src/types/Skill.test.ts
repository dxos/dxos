//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Skill from './Skill';

describe('Skill', () => {
  describe('mcpPrompt', () => {
    // The flag rides in the object's meta rather than as a schema field, so a skill stored in a
    // space carries it too — `Definition` is a build-time factory type and could not.
    test('opting in is readable off the constructed skill', ({ expect }) => {
      const skill = Skill.make({ key: 'org.dxos.skill.example', name: 'Example', mcpPrompt: true });
      expect(Skill.isMcpPrompt(skill)).toBe(true);
    });

    test('a skill that does not opt in is not projected', ({ expect }) => {
      // Absence is the default, not an error: most skills are written for an in-app chat runtime
      // and assume tools an MCP client does not have.
      const skill = Skill.make({ key: 'org.dxos.skill.example', name: 'Example' });
      expect(Skill.isMcpPrompt(skill)).toBe(false);
    });

    test('opting out explicitly reads as not projected', ({ expect }) => {
      const skill = Skill.make({ key: 'org.dxos.skill.example', name: 'Example', mcpPrompt: false });
      expect(Skill.isMcpPrompt(skill)).toBe(false);
    });
  });
});

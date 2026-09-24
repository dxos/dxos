//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';

import { FileOperation } from '#types';

import FileSkill from './file-skill.ts';

describe('FileSkill', () => {
  // An MCP host serves an operation only through a skill that both opts in and names it. Without
  // the opt-in the whole direct-upload flow breaks in a way nothing else catches: the host's
  // `createUpload` tool still mints URLs, the bytes still land in storage, and then no reachable
  // verb can turn them into a File object.
  test('opts into MCP projection and carries the upload verbs', ({ expect }) => {
    const skill = FileSkill.make();

    expect(Skill.isMcpPrompt(skill)).toBe(true);
    for (const operation of [FileOperation.Read, FileOperation.CreateFromSource, FileOperation.CreateFromUpload]) {
      expect(skill.tools).toContain(Operation.toolName(operation));
    }
  });
});

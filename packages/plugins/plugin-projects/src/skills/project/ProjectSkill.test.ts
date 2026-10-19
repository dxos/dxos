//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { projectFunctionToTool } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';

import instructions from './project-skill.md?raw';
import * as ProjectSkill from './ProjectSkill.ts';

const NAMED_TOOL = /`(projects-[a-z-]+|tasks-[a-z-]+|space-[a-z-]+)\b/g;

describe('ProjectSkill', () => {
  test('every operation projects to tool parameters', ({ expect }) => {
    const unprojectable = ProjectSkill.operations
      .filter((operation) => {
        try {
          projectFunctionToTool(operation);
          return false;
        } catch {
          return true;
        }
      })
      .map((operation) => Operation.toolName(operation));

    expect(unprojectable).toEqual([]);
  });

  // An MCP host builds its registry with `Operation.serializable`, which drops an operation whose schema
  // cannot become JSON Schema with only a verbose log, leaving the skill naming a tool that is not there.
  test('every operation the skill names serializes for an MCP registry', ({ expect }) => {
    expect(Operation.serializable(ProjectSkill.operations).length).toBe(ProjectSkill.operations.length);
  });

  test('every feature operation declares the types it touches, for hosts that do not activate the plugin', ({
    expect,
  }) => {
    const undeclared = ProjectSkill.operations
      .filter(
        (operation) =>
          String(operation.meta.key).includes('Feature') || String(operation.meta.key).includes('Showcase'),
      )
      .filter((operation) => (operation.types ?? []).length === 0)
      .map((operation) => Operation.toolName(operation));
    expect(undeclared).toEqual([]);
  });

  test('the workflow prose names no tool the skill does not declare', ({ expect }) => {
    const declared = new Set<string>(ProjectSkill.make().tools);
    const mentioned = [...instructions.matchAll(NAMED_TOOL)].map(([, name]) => name);
    expect([...new Set(mentioned.filter((name) => !declared.has(name)))]).toEqual([]);
  });
});

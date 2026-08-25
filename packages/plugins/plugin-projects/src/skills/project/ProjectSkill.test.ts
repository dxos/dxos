//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { projectFunctionToTool } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';

import instructions from './project-skill.md?raw';
import * as ProjectSkill from './ProjectSkill';

/** Backticked tokens in the workflow prose that are shaped like one of our tool names. */
const NAMED_TOOL = /`(projects-[a-z-]+|tasks-[a-z-]+|space-[a-z-]+)\b/g;

describe('ProjectSkill', () => {
  test('every operation projects to tool parameters', ({ expect }) => {
    // `makeToolResolverFromOperations` drops an operation whose input will not project — a
    // non-struct input throws `Unsupported schema AST` — and only logs, so the verb would be
    // declared, compile, and still never reach the model.
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

  test('the workflow prose names no tool the skill does not declare', ({ expect }) => {
    // The prose is markdown, so it cannot interpolate `Operation.toolName`; this is what keeps it
    // from telling the model to call something that is not in its toolkit.
    const declared = new Set<string>(ProjectSkill.make().tools);
    const mentioned = [...instructions.matchAll(NAMED_TOOL)].map(([, name]) => name);
    expect([...new Set(mentioned.filter((name) => !declared.has(name)))]).toEqual([]);
  });
});

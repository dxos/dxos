//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { projectFunctionToTool } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';

import instructions from './feature-map-skill.md?raw';
import * as FeatureMapSkill from './FeatureMapSkill.ts';

const NAMED_TOOL = /`(code-[a-z-]+|projects-[a-z-]+|tasks-[a-z-]+|space-[a-z-]+)\b/g;

/** Tools the prose may name that the project skill, which this one assumes, declares. */
const PROJECT_TOOLS = new Set(['projects-get', 'tasks-list']);

describe('FeatureMapSkill', () => {
  test('every operation projects to tool parameters', ({ expect }) => {
    const unprojectable = FeatureMapSkill.operations
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

  test('every operation the skill names serializes for an MCP registry', ({ expect }) => {
    expect(Operation.serializable(FeatureMapSkill.operations).length).toBe(FeatureMapSkill.operations.length);
  });

  test('every operation declares the types it touches, for hosts that do not activate the plugin', ({ expect }) => {
    const undeclared = FeatureMapSkill.operations
      .filter((operation) => (operation.types ?? []).length === 0)
      .map((operation) => Operation.toolName(operation));
    expect(undeclared).toEqual([]);
  });

  test('the workflow prose names no tool the skill does not declare', ({ expect }) => {
    const declared = new Set<string>(FeatureMapSkill.make().tools);
    const mentioned = [...instructions.matchAll(NAMED_TOOL)].map(([, name]) => name);
    expect([...new Set(mentioned.filter((name) => !declared.has(name) && !PROJECT_TOOLS.has(name)))]).toEqual([]);
  });
});

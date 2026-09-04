//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { projectFunctionToTool } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';

import * as ClaudeSkill from './ClaudeSkill';

describe('ClaudeSkill', () => {
  // The resolver drops an operation it cannot project (`operation cannot be projected to a tool`)
  // and the request runs with the rest — so an unprojectable input schema costs the model a tool
  // silently, with the skill still describing it.
  test('every operation projects to tool parameters', ({ expect }) => {
    const unprojectable = ClaudeSkill.operations
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

  // The resolver projects the REGISTRY RECORD, not the definition: a schema that survives
  // `projectFunctionToTool` directly can still fail once it has been through JSON Schema and back.
  test('every operation projects to tool parameters through the registry round-trip', ({ expect }) => {
    const unprojectable = ClaudeSkill.operations
      .filter((operation) => {
        try {
          projectFunctionToTool(Operation.deserialize(Operation.serialize(operation)));
          return false;
        } catch {
          return true;
        }
      })
      .map((operation) => Operation.toolName(operation));

    expect(unprojectable).toEqual([]);
  });

  test('the skill declares a tool for every operation behind it', ({ expect }) => {
    const declared = ClaudeSkill.make().tools;
    expect([...declared]).toEqual(ClaudeSkill.operations.map((operation) => Operation.toolName(operation)));
    expect(declared).toContain('claude-update-session-credentials');
  });
});

//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { projectFunctionToTool } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';

import * as RepositoriesSkill from './RepositoriesSkill.ts';

describe('RepositoriesSkill', () => {
  // The resolver projects the registry record and silently drops an operation it cannot project.
  test('every operation projects to tool parameters through the registry round-trip', ({ expect }) => {
    const unprojectable = RepositoriesSkill.operations
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
    expect([...RepositoriesSkill.make().tools]).toEqual(['code-update-project-repositories']);
  });
});

//
// Copyright 2022 DXOS.org
//

import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { WorkspaceProcessor } from './workspace-processor';

describe.skip('code analysis', () => {
  test('process workspace', () => {
    const baseDir = join(process.cwd());
    const processor = new WorkspaceProcessor(baseDir).init();
    const projects = processor.getProjects();
    expect(projects.length).toBeTruthy();
  });
});

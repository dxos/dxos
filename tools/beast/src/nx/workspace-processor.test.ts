//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { join } from 'path';

import { describe, test } from '@dxos/test';

import { WorkspaceProcessor } from './workspace-processor';

describe.skip('code analysis', () => {
  test('process workspace', () => {
    const baseDir = join(process.cwd());
    const processor = new WorkspaceProcessor(baseDir).init();
    const projects = processor.getProjects();
    expect(projects.length).toBeTruthy();
  });
});

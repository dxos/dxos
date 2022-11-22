//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { join } from 'path';

import { WorkspaceProcessor } from './workspace-processor';

describe('Code analysis', function () {
  it('process workspace', function () {
    const baseDir = join(process.cwd());
    const processor = new WorkspaceProcessor(baseDir).init();
    const projects = processor.getProjects();
    expect(projects.length).toBeTruthy();
  });
});

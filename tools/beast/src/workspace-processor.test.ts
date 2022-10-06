//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import path from 'path';

import { WorkspaceProcessor } from './workspace-processor';

const baseDir = path.join(__dirname, '../../..');

describe('Code analysis', function () {
  it('Sanity', function () {
    const processor = new WorkspaceProcessor(baseDir).init();
    const projects = processor.getProjects();
    expect(projects.length).toBeTruthy();
  });
});

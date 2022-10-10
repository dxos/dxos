//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { URL } from 'url';

import { WorkspaceProcessor } from './workspace-processor.js';

const baseDir = new URL('../../..', import.meta.url).pathname;

describe('Code analysis', function () {
  it('Sanity', function () {
    const processor = new WorkspaceProcessor(baseDir).init();
    const projects = processor.getProjects();
    expect(projects.length).toBeTruthy();
  });
});

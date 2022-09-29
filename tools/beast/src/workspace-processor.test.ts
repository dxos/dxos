//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';
import path from 'path';

import { WorkspaceProcessor } from './workspace-processor';

const baseDir = path.join(__dirname, '../../..');

describe('Code analysis', () => {
  test('Sanity', () => {
    const processor = new WorkspaceProcessor(baseDir).init();
    const projects = processor.getProjects();
    expect(projects.length).toBeTruthy();
  });
});

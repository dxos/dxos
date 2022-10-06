//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { Project } from 'ts-morph';

describe('Code analysis', function () {
  it('Sanity', function () {
    const project = new Project();
    project.addSourceFilesAtPaths('tools/beast/src/**/*.ts');

    const sourceFile = project.getSourceFileOrThrow('tools/beast/src/types.ts');
    const types = sourceFile.getTypeAliases();
    expect(types.length).toBeTruthy();
    types.forEach(type => {
      console.log(type.getName());
    });
  });
});

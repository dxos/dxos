//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';
import { Project } from 'ts-morph';

describe('Code analysis', () => {
  test('Sanity', () => {
    const project = new Project();
    project.addSourceFilesAtPaths('./src/**/*.ts');

    const sourceFile = project.getSourceFileOrThrow('./src/types.ts');
    const types = sourceFile.getTypeAliases();
    expect(types.length).toBeTruthy();
    types.forEach(type => {
      console.log(type.getName());
    });
  });
});

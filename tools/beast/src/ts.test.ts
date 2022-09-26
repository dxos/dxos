//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import pick from 'lodash/pick';
import { it as test } from 'mocha';
import path from 'path';
import { Project } from 'ts-morph';

describe('Code analysis', () => {
  test('sanity', async () => {
    const project = new Project();
    project.addSourceFilesAtPaths('./src/**/*.ts');

    const sourceFile = project.getSourceFileOrThrow('./src/types.ts');
    const types = sourceFile.getTypeAliases();
    expect(types).toHaveLength(3);
    types.forEach(type => {
      console.log(type.getName());
    });
  });

  test('client', async () => {
    const projectDir = path.join(__dirname, '../../..', 'packages/sdk/client');

    // https://ts-morph.com/navigation/getting-source-files
    const project = new Project({
      tsConfigFilePath: path.join(projectDir, 'tsconfig.json')
      // skipAddingFilesFromTsConfig: false
    });

    // Gets ALL referenced directories.
    const dirs = project.getDirectories();
    // console.log(dirs.map(d => d.getPath()));
    expect(dirs.length).toBeTruthy();

    // TODO(burdon): Decorators to find files.
    const target = 'Client';
    const file = project.getSourceFileOrThrow(file => {
      return file.getClasses().some(clazz => clazz.getName() === target);
    });

    // TODO(burdon): Generate class diagram (of readonly class instances -- or via decorators).
    //  Also track `new` construction of decorated objects.
    //  https://www.typescriptlang.org/docs/handbook/decorators.html
    const clazz = file.getClasses().find(clazz => clazz.getName() === target)!;
    const struct = clazz.getStructure();
    const info = {
      ...pick(struct, ['name', 'isExported']),
      properties: struct.properties?.map(p => p.type && pick(p, ['name', 'type', 'scope', 'isReadonly'])).filter(Boolean)
    };

    console.log(JSON.stringify(info, undefined, 2));
  });
});

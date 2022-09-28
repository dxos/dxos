//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import pick from 'lodash/pick';
import { it as test } from 'mocha';
import path from 'path';
import { ClassDeclaration, InterfaceDeclaration, Project } from 'ts-morph';

import { Flowchart } from './mermaid';

describe('Code analysis', () => {
  test('sanity', () => {
    const project = new Project();
    project.addSourceFilesAtPaths('./src/**/*.ts');

    const sourceFile = project.getSourceFileOrThrow('./src/types.ts');
    const types = sourceFile.getTypeAliases();
    expect(types).toHaveLength(3);
    types.forEach(type => {
      console.log(type.getName());
    });
  });

  test.only('client', () => {
    const projectDir = path.join(__dirname, '../../..', 'packages/sdk/client');

    // https://ts-morph.com/navigation/getting-source-files
    const project = new Project({
      tsConfigFilePath: path.join(projectDir, 'tsconfig.json')
      // skipAddingFilesFromTsConfig: false
    });

    // Gets ALL referenced directories.
    const dirs = project.getDirectories();
    expect(dirs.length).toBeTruthy();

    // https://ts-morph.com/details/index
    // TODO(burdon): Break out class
    // TODO(burdon): Navigate imports (package), then look for private final, new, etc.

    // TODO(burdon): Find package.
    // TODO(burdon): Generalize processor algorithm to sort by group.

    // TODO(burdon): Create decorators to find files.
    // TODO(burdon): Generate class diagram (of readonly class instances -- or via decorators).
    //  Also track `new` construction of decorated objects.
    //  https://www.typescriptlang.org/docs/handbook/decorators.html

    /**
     * https://github.com/dsherret/ts-morph/blob/latest/packages/ts-morph/src/structures/class/base/ClassLikeDeclarationBaseStructure.ts
     */
    // TODO(burdon): Correct way to do navigation (e.g., disambiguate names via imports, etc?)
    const findClassOrInterface = (name: string): ClassDeclaration | InterfaceDeclaration | undefined => {
      const files = project.getSourceFiles();
      const file = files.find(file => file.getClass(name));
      if (file) {
        const c = file.getClass(name);
        if (c) {
          return c;
        }

        const i = file.getInterface(name);
        if (i) {
          return i;
        }
      }
    }

    const process = (flowchart: Flowchart, root: ClassDeclaration | InterfaceDeclaration, depth: number) => {
      const struct = root.getStructure();
      const info = {
        ...pick(struct, ['name', 'isExported']),
        properties: struct.properties?.map(p => p.type && pick(p, ['name', 'type', 'scope', 'isReadonly']))
          .filter(Boolean)
      };

      flowchart.addNode({
        id: root.getName()!
      });

      info.properties!.forEach((p: any) => {
        const ref = findClassOrInterface(p.type);
        if (ref) {
          flowchart.addNode({
            id: ref.getName()!
          });

          flowchart.addLink({
            source: root.getName()!,
            target: ref.getName()!
          });

          // TODO(burdon): Prevent loops.
          if (depth > 0) {
            process(flowchart, ref, depth - 1);
          }
        }
      });
    }

    const flowchart = new Flowchart();

    const target = 'Client';
    const root = findClassOrInterface(target);
    if (root) {
      // TODO(burdon): Look at ts-morph tests.
      process(flowchart, root, 2);
      const file = root.getSourceFile();
      const imports = file.getImportDeclarations().map(i => i.getStructure());
      const i = imports.find(i => i.moduleSpecifier.startsWith('@dxos/config'));
      console.log(i);
      const dir = file.getDirectoryPath();
      console.log(dir);
    }

    console.log(flowchart.render());
  });
});

//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import pick from 'lodash.pick';
import path from 'path';
import { ClassDeclaration } from 'ts-morph';

import { Flowchart } from './mermaid';
import { ProjectProcessor } from './project-processor';
import { WorkspaceProcessor } from './workspace-processor';

// TODO(burdon): Navigate imports (package), then look for private final, new, etc.
// TODO(burdon): Find package.
// TODO(burdon): Generalize processor algorithm to sort by group.
// TODO(burdon): Create decorators to find files.
// TODO(burdon): Generate class diagram (of readonly class instances -- or via decorators).
//  Also track `new` construction of decorated objects.
//  https://www.typescriptlang.org/docs/handbook/decorators.html

const baseDir = path.join(__dirname, '../../..');

describe('Code analysis', function () {
  it('Sanity', function () {
    const processor = new WorkspaceProcessor(baseDir).init();
    const builder = new ProjectProcessor(baseDir, processor, '@dxos/client');

    const root = builder.getClass('Client');
    console.log(root?.getName());
    expect(root?.getName()).toBeTruthy();
  });

  it('Create graph', function () {
    const processor = new WorkspaceProcessor(baseDir).init();
    const builder = new ProjectProcessor(baseDir, processor, '@dxos/client');

    const process = (flowchart: Flowchart, root: ClassDeclaration, depth: number) => {
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
        const ref = builder.getClass(p.type);
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
    };

    const flowchart = new Flowchart();

    {
      const target = 'Client';
      const root = builder.getClass(target);
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
    }

    console.log(flowchart.render());
  }).timeout(5_000);
});

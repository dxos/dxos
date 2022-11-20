//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { ClassDeclaration, Node, Project, SourceFile } from 'ts-morph';

import { log } from '@dxos/log';

// https://www.npmjs.com/package/ts-morph
// https://ts-morph.com/details/index

/**
 * TS Processor.
 */
export class Processor {
  private readonly _project = new Project();
  constructor(private readonly rootDir: string, private readonly glob: string) {
    // https://ts-morph.com/setup
    this._project.addSourceFilesAtPaths(`${this.rootDir}/${glob}`);
  }

  processFile(path: string) {
    const sourceFile: SourceFile = this._project.getSourceFileOrThrow(`${this.rootDir}/${path}`);
    const classes = sourceFile.getClasses();
    expect(classes.length).toBeTruthy();
    classes.forEach((name) => {
      const clazz = sourceFile.getClass(name.getName()!)!;
      this.processClass(clazz);
    });
  }

  processClass(clazz: ClassDeclaration) {
    log('class', { class: clazz.getName() });
    // https://ts-morph.com/details/classes#properties
    const properties = clazz.getProperties();
    properties.forEach((property) => {
      const node: Node = property;
      const text = node.print();
      const name = property.getName();
      const type = property.getType();

      if (!type.isLiteral()) {
        if (!type.compilerType.symbol) {
          log.warn('Missing symbol', { type: type.getText(), text });
          return;
        }

        // TODO(burdon): ServiceContext is class but ServiceRegistry<ClientServices> is not.
        const symbol = type.compilerType.symbol.getName();
        log('maybe class', { property: name, symbol, clazz: type.isClassOrInterface() });

        if (type.isClassOrInterface()) {
          const fileName = type.compilerType.symbol.valueDeclaration?.parent.getSourceFile().fileName;
          if (fileName) {
            const sourceFile = this._project.getSourceFileOrThrow(fileName);
            const clazz = sourceFile.getClass(symbol);
            if (clazz) {
              // TODO(burdon): Check for circular deps.
              // this.processClass(clazz);
            }
          }
        }
      }
    });
  }
}

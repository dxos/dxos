//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { ClassDeclaration, Node, Project, SourceFile } from 'ts-morph';

import { log } from '@dxos/log';

// https://www.npmjs.com/package/ts-morph
// https://ts-morph.com/details/index

export type ClassDefinition = {
  name: string;
  properties: {
    property: string;
    type: string;
    clazz?: ClassDefinition;
  }[];
};

/**
 * TS Processor.
 */
export class ClassProcessor {
  private readonly _project = new Project();
  private readonly _classes = new Map<string, ClassDefinition>();

  constructor(private readonly rootDir: string, private readonly glob = 'src/**/*.ts') {
    // https://ts-morph.com/setup
    this._project.addSourceFilesAtPaths(`${this.rootDir}/${glob}`);
  }

  getClasses() {
    return Array.from(this._classes.values());
  }

  processFile(path: string) {
    const sourceFile: SourceFile = this._project.getSourceFileOrThrow(`${this.rootDir}/${path}`);
    const classes = sourceFile.getClasses();
    classes.forEach((name) => {
      const clazz = sourceFile.getClass(name.getName()!)!;
      this.processClass(clazz);
    });
  }

  processClass(clazz: ClassDeclaration): ClassDefinition {
    const name = clazz.getName();
    assert(name);
    log('class', { class: name });
    let def = this._classes.get(name);
    if (def) {
      return def;
    }

    def = {
      name,
      properties: []
    };

    this._classes.set(name, def);

    // https://ts-morph.com/details/classes#properties
    const properties = clazz.getProperties();
    properties.forEach((property) => {
      const node: Node = property;
      const text = node.print();
      const propertyName = property.getName();
      const propertyType = property.getType();

      if (!propertyType.isLiteral()) {
        if (!propertyType.compilerType.symbol) {
          log('Missing symbol', { type: propertyType.getText(), text });
          return;
        }

        // TODO(burdon): Sets/Maps of classes.
        // TODO(burdon): ServiceContext is class but ServiceRegistry<ClientServices> is not.
        //  Type not known?
        const symbol = propertyType.compilerType.symbol.getName();
        log('property', { property: propertyName, symbol, clazz: propertyType.isClassOrInterface() });
        if (propertyType.isClassOrInterface()) {
          const fileName = propertyType.compilerType.symbol.valueDeclaration?.parent.getSourceFile().fileName;
          if (fileName) {
            const sourceFile = this._project.getSourceFileOrThrow(fileName);
            const clazz = sourceFile.getClass(symbol);
            if (clazz) {
              // TODO(burdon): Check for circular deps.
              const classDef = this.processClass(clazz);
              def!.properties.push({
                property: propertyName,
                type: 'class',
                clazz: classDef
              });
            }
          }
        }
      }
    });

    return def;
  }
}

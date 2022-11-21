//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { ClassDeclaration, Project, SourceFile } from 'ts-morph';

import { log } from '@dxos/log';

// https://www.npmjs.com/package/ts-morph
// https://ts-morph.com/details/index

export type ClassDefinition = {
  name: string;
  methods: {
    async?: boolean; // TODO(burdon): Implement.
    name: string;
  }[];
  properties: {
    name: string;
    type?: string;
    initializer?: boolean;
    readonly?: boolean;
    classDef?: ClassDefinition;
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

  // TODO(burdon): Only searches current project.
  findClass(className: string): ClassDeclaration | undefined {
    for (const sourceFile of this._project.getSourceFiles()) {
      const classDef = sourceFile.getClass(className);
      if (classDef) {
        return classDef;
      }
    }

    return undefined;
  }

  processFile(path: string) {
    const sourceFile: SourceFile = this._project.getSourceFileOrThrow(`${this.rootDir}/${path}`);
    const classes = sourceFile.getClasses();
    classes.forEach((name) => {
      const clazz = sourceFile.getClass(name.getName()!)!;
      this.processClass(clazz);
    });
  }

  processClass(classDeclaration: ClassDeclaration): ClassDefinition {
    // Structure can be stringified.
    // TODO(burdon): extends, implements, getAccessors
    const { name, methods, properties, getAccessors } = classDeclaration.getStructure();
    assert(name);
    log(`Processing ${name}`);
    let classDef = this._classes.get(name);
    if (classDef) {
      return classDef;
    }

    // TODO(burdon): Doesn't show constructor setters.

    classDef = { name, methods: [], properties: [] };
    this._classes.set(name, classDef);

    methods?.forEach(({ name: methodName, scope }) => {
      if (!scope || scope === 'public') {
        classDef!.methods.push({ name: methodName });
      }
    });

    getAccessors?.forEach(({ name }) => {
      classDef!.properties.push({ name });
    });

    properties?.forEach((property) => {
      const { name: propertyName, type, initializer, isReadonly } = property;

      // TODO(burdon): Provide source roots for other packages.
      //  Check import statements.
      if (!type) {
        log(`Unknown type for ${classDef!.name}.${propertyName}`);
      }

      // TODO(burdon): Handle typed maps.
      if (type && typeof type === 'string') {
        const [propertyType] = type.split('<'); // TODO(burdon): Remove generic.
        const classDeclaration = this.findClass(propertyType);
        if (classDeclaration) {
          const propertyClassDef = this.processClass(classDeclaration);
          classDef!.properties.push({
            name: propertyName,
            type: 'class',
            classDef: propertyClassDef
          });
        } else {
          // TODO(burdon): Provide source roots for other packages.
          log(`Type not found: ${propertyType}`);
          classDef!.properties.push({
            name: propertyName,
            type: 'class',
            initializer: !!initializer,
            readonly: isReadonly,
            classDef: {
              name: propertyType,
              methods: [],
              properties: []
            }
          });
        }
      }
    });

    return classDef;
  }
}

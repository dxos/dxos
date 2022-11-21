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

  // prettier-ignore
  constructor(
    private readonly sources: string[]
  ) {
    // https://ts-morph.com/setup
    this._project.addSourceFilesAtPaths(sources);
    log('files', { sources, count: this._project.getSourceFiles().length });
  }

  getClasses() {
    return Array.from(this._classes.values());
  }

  /**
   * Search all source files for referenced class.
   */
  // TODO(burdon): This would strictly require the import statement to disambiguate.
  findClass(className: string): ClassDeclaration | undefined {
    for (const sourceFile of this._project.getSourceFiles()) {
      const classDef = sourceFile.getClass(className);
      if (classDef) {
        return classDef;
      }
    }

    return undefined;
  }

  /**
   * Process classes in referenced file.
   */
  processFile(filePath: string) {
    const sourceFile: SourceFile = this._project.getSourceFileOrThrow(filePath);
    const classes = sourceFile.getClasses();
    classes.forEach((name) => {
      const clazz = sourceFile.getClass(name.getName()!)!;
      this.processClass(clazz);
    });
  }

  /**
   * Recursively process class definitions.
   */
  processClass(classDeclaration: ClassDeclaration): ClassDefinition | undefined {
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
      const { name: propertyName, initializer, isReadonly } = property;

      const tsProperty = classDeclaration
        .getProperties()
        .find((property) => property.getStructure().name === propertyName);

      // TODO(burdon): The type returned from getStructure() is null if from another package.
      //  Also, symbol is undefined for literals, but getType isn't well-formed.
      const propertyType = tsProperty?.getType().compilerType.symbol?.escapedName;
      if (!propertyType) {
        log.warn(`Unknown type for ${classDef!.name}.${propertyName}`);
        return;
      }

      // Skip type definitions.
      if (propertyType === '__type') {
        return;
      }

      assert(propertyType);
      {
        const classDeclaration = this.findClass(propertyType);
        if (classDeclaration) {
          const propertyClassDef = this.processClass(classDeclaration);
          if (propertyClassDef) {
            classDef!.properties.push({
              name: propertyName,
              type: 'class',
              initializer: !!initializer,
              readonly: isReadonly,
              classDef: propertyClassDef
            });
          }
        }
      }
    });

    return classDef;
  }
}

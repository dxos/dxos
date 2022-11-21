//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import {
  ClassDeclaration,
  InterfaceDeclaration,
  ParameterDeclaration,
  Project,
  PropertyDeclaration,
  SourceFile,
  Type
} from 'ts-morph';

import { log } from '@dxos/log';

// https://www.npmjs.com/package/ts-morph
// https://ts-morph.com/details/index

export enum Cardinality {
  Default,
  Map = 'Map',
  Set = 'Set'
}

export type ClassProperty = {
  name: string;
  type?: string;
  cardinality?: Cardinality;
  initializer?: boolean;
  readonly?: boolean;
  classDef?: ClassDefinition;
};

// TODO(burdon): Class or Interface.
export type ClassDefinition = {
  name: string;
  type: 'class' | 'interface';
  methods: {
    async?: boolean; // TODO(burdon): Implement.
    name: string;
  }[];
  properties: ClassProperty[];
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
  findClassOrInterface(className: string): ClassDeclaration | InterfaceDeclaration | undefined {
    for (const sourceFile of this._project.getSourceFiles()) {
      const classDef = sourceFile.getClass(className);
      if (classDef) {
        return classDef;
      }

      const interfaceDef = sourceFile.getInterface(className);
      if (interfaceDef) {
        return interfaceDef;
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
      this.processClassOrInterface(clazz);
    });
  }

  /**
   * Recursively process class or interface definitions.
   */
  processClassOrInterface(classDeclaration: ClassDeclaration | InterfaceDeclaration): ClassDefinition | undefined {
    const { name } = classDeclaration.getStructure();
    assert(name);
    log('processing', { className: name });
    const classDef = this._classes.get(name);
    if (classDef) {
      return classDef;
    }

    if (classDeclaration instanceof InterfaceDeclaration) {
      // TODO(burdon): Process implementations.
      return this.processInterface(classDeclaration);
    } else {
      return this.processClass(classDeclaration);
    }
  }

  processInterface(interfaceDeclaration: InterfaceDeclaration): ClassDefinition | undefined {
    const { name, methods, properties } = interfaceDeclaration.getStructure();
    assert(name);

    // TODO(burdon): Process implementations.
    // TODO(burdon): Process property types the same as classes.
    const classDef: ClassDefinition = {
      name,
      type: 'interface',
      methods: methods?.map(({ name }) => ({ name })) ?? [],
      properties: properties?.map(({ name }) => ({ name })) ?? []
    };

    this._classes.set(name, classDef);

    return classDef;
  }

  processClass(classDeclaration: ClassDeclaration): ClassDefinition | undefined {
    // Structure can be stringified.
    // TODO(burdon): extends, implements, etc.
    const { name, methods, getAccessors } = classDeclaration.getStructure();
    assert(name);

    // TODO(burdon): Process interfaces.
    // classDeclaration.getImplements().forEach((i) => {});

    const classDef: ClassDefinition = {
      name,
      type: 'class',
      methods: [],
      properties: []
    };

    this._classes.set(name, classDef);

    //
    // Methods
    //
    methods?.forEach(({ name: methodName, scope }) => {
      // Skip `[inspect.custom]`, etc.
      if (methodName.match(/\W/)) {
        return;
      }

      if (!scope || scope === 'public') {
        classDef!.methods.push({ name: methodName });
      }
    });

    //
    // Accessor
    //
    getAccessors?.forEach(({ name }) => {
      classDef!.properties.push({ name });
    });

    //
    // Properties
    //
    classDeclaration.getProperties().forEach((property) => {
      this.processProperty(classDef, property);
    });

    //
    // Constructor properties.
    //
    classDeclaration.getConstructors().forEach((ctor) => {
      // Could be multiple constructors so process params once.
      const params = new Map<string, ParameterDeclaration>();
      ctor.getParameters().forEach((parameter) => {
        params.set(parameter.getName().toString(), parameter);
      });

      Array.from(params.values()).forEach((parameter) => {
        this.processProperty(classDef, parameter);
      });
    });

    return classDef;
  }

  /**
   * Process properties or constructor params.
   */
  processProperty(classDef: ClassDefinition, property: PropertyDeclaration | ParameterDeclaration) {
    const type = property.getType();
    const { name: propertyName, initializer, isReadonly } = property.getStructure();
    assert(propertyName);

    let propertyType = type.compilerType.symbol?.escapedName;
    let cardinality = Cardinality.Default;

    // Symbol is undefined for literals, but getType isn't well-formed.
    if (!propertyType) {
      log.debug(`Unknown type for ${classDef!.name}.${propertyName}`);
      return;
    }

    // Skip type definitions.
    if (propertyType === '__type') {
      return;
    }

    // Collections.
    switch (propertyType) {
      case 'Set':
      case 'ComplexSet': {
        const typeArguments: Type[] = type.getTypeArguments() ?? [];
        if (typeArguments.length === 1) {
          propertyType = typeArguments[0].compilerType.symbol?.escapedName;
          if (!propertyType) {
            return;
          }
          cardinality = Cardinality.Set;
        }
        break;
      }

      case 'Map':
      case 'ComplexMap': {
        const typeArguments: Type[] = type.getTypeArguments() ?? [];
        if (typeArguments.length === 2) {
          propertyType = typeArguments[1].compilerType.symbol?.escapedName;
          if (!propertyType) {
            return;
          }
          cardinality = Cardinality.Map;
        }
        break;
      }
    }

    const propertyClassDeclaration = this.findClassOrInterface(propertyType);
    if (propertyClassDeclaration) {
      log('property', { propertyName: `${classDef.name}.${propertyName}`, propertyType });
      const propertyClassDef = this.processClassOrInterface(propertyClassDeclaration);
      if (propertyClassDef) {
        classDef!.properties.push({
          name: propertyName,
          type: 'class',
          cardinality,
          initializer: !!initializer,
          readonly: isReadonly,
          classDef: propertyClassDef
        });
      }
    } else {
      log('skipping', { propertyName: `${classDef.name}.${propertyName}`, propertyType });
    }
  }
}

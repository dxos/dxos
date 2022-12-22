//
// Copyright 2022 DXOS.org
//

import * as pb from 'protobufjs';

export const codegenSchema = (schema: pb.Root) =>
  `const schemaJson = ${JSON.stringify(JSON.stringify(schema.toJSON()))};`;

/**
 * Iterate type definitions.
 */
export function* iterTypes(ns: pb.NamespaceBase): IterableIterator<pb.Type> {
  for (const type of ns.nestedArray) {
    if (type instanceof pb.Type) {
      yield type;
    }

    if (type instanceof pb.Type || type instanceof pb.Namespace) {
      yield* iterTypes(type);
    }
  }
}

/**
 * Field type definition.
 */
const codegenType = (field: pb.Field): string => {
  const scalar = () => {
    if (field.resolvedType) {
      return field.resolvedType.name;
    } else {
      switch (field.type) {
        case 'string':
          return 'string';
        case 'bytes':
          return 'Uint8Array';
        case 'bool':
          return 'boolean';
        case 'double':
        case 'float':
          return 'number';
        case 'int32':
        case 'uint32':
        case 'sint32':
        case 'fixed32':
        case 'sfixed32':
          return 'number';
        case 'int64':
        case 'uint64':
        case 'sint64':
        case 'fixed64':
        case 'sfixed64':
          return 'bigint';
        default:
          throw new Error(`Invalid field type: ${field.type}`);
      }
    }
  };

  field.resolve();
  if (field.repeated) {
    if (field.resolvedType) {
      return `OrderedSet<${scalar()}>`;
    } else {
      return `Set<${scalar()}>`;
    }
  } else {
    return scalar();
  }
};

/**
 * Generate class definition.
 */
export const codegenObjectClass = (type: pb.Type) => {
  const name = type.name;
  const fullName = type.fullName.slice(1);
  const initializer = type.fieldsArray.map((field) => `${field.name}?: ${codegenType(field)}`).join(',');
  const fields = type.fieldsArray.map((field) => `declare ${field.name}: ${codegenType(field)};`);

  const content = [
    `export class ${name} extends EchoObjectBase {`,
    `  static readonly type = schema.getType('${fullName}');`,
    `  static filter(opts?: { ${initializer} }): TypeFilter<${name}> {`,
    `    return ${name}.type.createFilter(opts);`,
    '  }',
    `  constructor(opts?: { ${initializer} }) {`,
    `    super({ ...opts, '@type': ${name}.type.name }, ${name}.type);`,
    '  }',
    '',
    ...fields.map((field) => `  ${field}`),
    '}',
    '',
    `schema.registerPrototype(${name});`
  ];

  return content.join('\n');
};

export const codegenPlainInterface = (type: pb.Type) => {
  const name = type.name;
  const fields = type.fieldsArray.map((field) => `${field.name}: ${codegenType(field)};`);
  const content = [`export interface ${name} {`, ...fields.map((field) => `  ${field}`), '}'];
  return content.join('\n');
};

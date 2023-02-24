//
// Copyright 2022 DXOS.org
//

import * as pb from 'protobufjs';

import { text } from '@dxos/plate';

const packageName = '@dxos/echo-schema';
const namespaceName = 'dxosEchoSchema';

// There's no technical requirement to reserve those, but doing this avoids any potential confusion.
const reservedTypeNames = [namespaceName, 'EchoSchema', 'Document', 'TypeFilter', 'Text'];

const reservedFieldNames = ['id', '__typename', '__deleted'];

/**
 * Protobuf schema as JSON object.
 */
// TODO(burdon): Missing name.
export const createSchema = (schema: pb.NamespaceBase) => {
  const json = JSON.stringify(JSON.stringify(schema.toJSON()));
  const str = json.replace(/\\"/g, '"').replace(/(^"|"$)/g, '');
  return `const schemaJson = '${str}';`;
};

/**
 * Type definition generator.
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
export const createType = (field: pb.Field): string => {
  const scalar = () => {
    if (field.resolvedType) {
      if (field.resolvedType.name === 'Text') {
        return `${namespaceName}.Text`;
      }

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
    // if (field.resolvedType) {
    return `${scalar()}[]`;
    // } else {
    //   return `Set<${scalar()}>`;
    // }
  } else {
    return scalar();
  }
};

/**
 * Generate type definitions.
 */
export const generate = (root: pb.NamespaceBase): string => {
  const declarations = [];
  for (const type of iterTypes(root)) {
    if (type.name === 'Text') {
      continue;
    }

    if (type.options?.['(object)'] !== true) {
      declarations.push(createPlainInterface(type));
    } else {
      declarations.push(createObjectClass(type));
    }
  }

  return text`
  import * as ${namespaceName} from '${packageName}';

  ${createSchema(root)}

  export const schema = ${namespaceName}.EchoSchema.fromJson(schemaJson);

  ${declarations.join('\n')}
  `;
};

/**
 * Generate class definition.
 */
export const createObjectClass = (type: pb.Type) => {
  if (reservedTypeNames.includes(type.name)) {
    throw new Error(`Reserved type name: ${type.name}`);
  }
  for (const field of type.fieldsArray) {
    if (reservedFieldNames.includes(field.name)) {
      throw new Error(`Reserved field name: ${field.name}`);
    }
  }

  const name = type.name;
  const fullName = type.fullName.slice(1);
  const initializer = type.fieldsArray.map((field) => `${field.name}: ${createType(field)};`);
  const fields = type.fieldsArray.map((field) => `declare ${field.name}: ${createType(field)};`);

  // prettier-ignore
  return text`
    export type ${name}Props = {\n${initializer}\n};

    export class ${name} extends ${namespaceName}.Document<{}> {
      static readonly type = schema.getType('${fullName}');

      static filter(opts?: Partial<${name}Props>): ${namespaceName}.TypeFilter<${name}> {
      return ${name}.type.createFilter(opts);
      }

      constructor(opts?: Partial<${name}Props>) {
        super({ ...opts}, ${name}.type);
      }
      ${fields}
    }

    schema.registerPrototype(${name});
  `;
};

/**
 * Plain objects.
 */
export const createPlainInterface = (type: pb.Type) => {
  if (reservedTypeNames.includes(type.name)) {
    throw new Error(`Reserved type name: ${type.name}`);
  }

  const name = type.name;
  const fields = type.fieldsArray.map((field) => `${field.name}?: ${createType(field)};`);

  // prettier-ignore
  return text`
  export interface ${name} {
    ${fields}
  }
  `;
};

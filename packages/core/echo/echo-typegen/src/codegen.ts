//
// Copyright 2022 DXOS.org
//

import * as pb from 'protobufjs';

const packageName = '@dxos/echo-schema';

const types = ['EchoSchema', 'DocumentBase', 'TypeFilter', 'TextObject'];

/**
 * Source builder and formatter.
 */
export class SourceBuilder {
  private _content: string[] = [];

  // TODO(burdon): Reformat using prettier.
  get content() {
    return this._content.join('\n');
  }

  push(line: string | string[], indent = 0) {
    const prefix = ' '.repeat(indent * 2);
    if (typeof line === 'string') {
      this._content.push(prefix + line);
    } else {
      this._content.push(...line.map((line) => prefix + line));
    }

    return this;
  }

  nl() {
    this._content.push('');
    return this;
  }
}

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
      if (field.resolvedType.name === 'TextObject') {
        return 'TextObject';
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
export const generate = (builder: SourceBuilder, root: pb.NamespaceBase) => {
  // prettier-ignore
  builder
    .push(`import { ${types.sort().join(', ')} } from '${packageName}';`).nl()
    .push(createSchema(root)).nl()
    .push('export const schema = EchoSchema.fromJson(schemaJson);').nl();

  for (const type of iterTypes(root)) {
    if (type.name === 'TextObject') {
      continue;
    }

    if (type.options?.['(object)'] !== true) {
      createPlainInterface(builder, type);
    } else {
      createObjectClass(builder, type);
    }

    builder.nl();
  }
};

/**
 * Generate class definition.
 */
export const createObjectClass = (builder: SourceBuilder, type: pb.Type) => {
  const name = type.name;
  const fullName = type.fullName.slice(1);
  const initializer = type.fieldsArray.map((field) => `${field.name}?: ${createType(field)}`).join(', ');
  const fields = type.fieldsArray.map((field) => `declare ${field.name}: ${createType(field)};`);

  // prettier-ignore
  builder
    .push(`export class ${name} extends DocumentBase {`)
    .push(`static readonly type = schema.getType('${fullName}');`, 1).nl()

    .push(`static filter(opts?: { ${initializer} }): TypeFilter<${name}> {`, 1)
    .push(`return ${name}.type.createFilter(opts);`, 2)
    .push('}', 1).nl()

    .push(`constructor(opts?: { ${initializer} }) {`, 1)
    .push(`super({ ...opts}, ${name}.type);`, 2)
    .push('}', 1).nl()

    .push(fields, 1)
    .push('}').nl()

    .push(`schema.registerPrototype(${name});`);
};

/**
 * Plain objects.
 */
export const createPlainInterface = (builder: SourceBuilder, type: pb.Type) => {
  const name = type.name;
  const fields = type.fieldsArray.map((field) => `${field.name}?: ${createType(field)};`);

  // prettier-ignore
  builder
    .push(`export interface ${name} {`)
    .push(fields, 1)
    .push('}');
};

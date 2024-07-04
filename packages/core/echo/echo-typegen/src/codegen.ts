//
// Copyright 2022 DXOS.org
//

import * as pb from 'protobufjs';

import { plate } from '@dxos/plate';
import { getFullNestedTypeName, getRelativeName, stringifyFullyQualifiedName, isType } from '@dxos/protobuf-compiler';

const importNamespace = 'dxos_echo_schema';

const reservedTypeNames = [importNamespace];
const reservedFieldNames = ['id', '__typename', '__deleted', 'meta'];

// Types that are injected from `importNamespace`.
// prettier-ignore
const injectedTypes = [
  '.dxos.schema.Expando',
  '.dxos.schema.Schema',
  '.dxos.schema.Text', // TODO(burdon): Matches TextObject.
  '.dxos.schema.TypedObject',
];

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
      if (injectedTypes.includes(field.resolvedType.fullName)) {
        return `${importNamespace}.${field.resolvedType.name}`;
      }

      return stringifyFullyQualifiedName(
        getRelativeName(getFullNestedTypeName(field.resolvedType), getFullNestedTypeName(field.message!)),
      );
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

const isSchemaNamespace = (ns: pb.ReflectionObject) =>
  (ns instanceof pb.Namespace &&
    ns.name === 'dxos' &&
    ns.nestedArray.length === 1 &&
    ns.nestedArray[0].name === 'schema') ||
  (ns instanceof pb.Namespace && ns.name === 'schema' && ns.parent?.name === 'dxos');

const getStartingNamespace = (ns: pb.NamespaceBase): pb.NamespaceBase => {
  const nestedArray = ns.nestedArray.filter((nested) => !isSchemaNamespace(nested));
  if (nestedArray.length === 1 && nestedArray[0] instanceof pb.Namespace && !isType(nestedArray[0])) {
    return getStartingNamespace(nestedArray[0]);
  }

  return ns;
};

export type CodegenOptions = {
  schemaPackage: string;
};

/**
 * Generate type definitions.
 */
export const generate = (root: pb.NamespaceBase, options: CodegenOptions): string => {
  const startNamespace = getStartingNamespace(root);

  const declarations = startNamespace.nestedArray.flatMap((nested) => Array.from(emitDeclarations(nested)));

  return plate`
  import * as ${importNamespace} from '${options.schemaPackage}';

  export const types = new ${importNamespace}.TypeCollection();

  ${declarations}

  types.link();
  `;
};

const isObject = (type: pb.ReflectionObject) => type.options?.['(object)'] === true;

function* emitDeclarations(ns: pb.ReflectionObject): Generator<string> {
  if (ns instanceof pb.Type) {
    // NOTE: Hack to allow schema.proto to compile.
    if (injectedTypes.includes(ns.fullName) && ns.fieldsArray.length === 1) {
      return;
    }

    if (!isObject(ns)) {
      yield createPlainInterface(ns);
    } else {
      yield createObjectClass(ns);
    }
  }

  if (ns instanceof pb.Enum) {
    yield createEnum(ns);
  }

  if ((ns instanceof pb.Namespace || ns instanceof pb.Type) && ns.nestedArray.length > 0) {
    yield plate`
      export namespace ${ns.name} {
        ${ns.nestedArray.flatMap((nested) => Array.from(emitDeclarations(nested)))}
      }
    `;
  }
}

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
  return plate`
    export type ${name}Props = {\n${initializer}\n};

    export class ${name} extends ${importNamespace}.TypedObject<${name}Props> {
      declare static readonly schema: ${importNamespace}.Schema;

      static filter(filter?: Partial<${name}Props> | ${importNamespace}.OperatorFilter<${name}>): ${importNamespace}.Filter<${name}> {
        return ${importNamespace}.Filter.typename('${fullName}', filter);
      }
  
      constructor(initValues?: Partial<${name}Props>, opts?: ${importNamespace}.ObjectCoreOptions) {
        super({ ...initValues}, { schema: ${name}.schema, ...opts });
      }
      ${fields}
    }

    types.registerPrototype(${name}, ${JSON.stringify(createProtoSchema(type))});
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
  return plate`
  export interface ${name} {
    ${fields}
  }
  `;
};

/**
 * Generate enum definition.
 */
export const createEnum = (type: pb.Enum) => {
  if (reservedTypeNames.includes(type.name)) {
    throw new Error(`Reserved type name: ${type.name}`);
  }

  const name = type.name;
  const values = Object.entries(type.values).map(([key, value]) => `${key} = ${value},`);

  // prettier-ignore
  return plate`
    export enum ${name} {
      ${values}
    }
  `;
};

// Copied from packages/core/echo/echo-schema/src/proto/gen/schema.ts

export enum PropType {
  NONE = 0,
  STRING = 1,
  NUMBER = 2,
  BOOLEAN = 3,
  DATE = 4,
  REF = 5,
  RECORD = 6,
  ENUM = 7,
}

export type SchemaProps = {
  typename: string;
  props: Prop[];
};

export interface Prop {
  id?: string;
  type?: PropType;
  refName?: string;
  refModelType?: string;
  repeated?: boolean;
  digits?: number;
  props?: Prop[];
  variants?: {
    tag: number;
    name: string;
  }[];
}

// Using max depth of 2 to not crash on recursive types (schema).
const getProps = (type: pb.Type, depth = 2): Prop[] => {
  type.fieldsArray.forEach((field) => field.resolve());
  return type.fieldsArray.map((field) => {
    const type = getPropType(field);
    return {
      id: field.name,
      type,
      repeated: field.repeated,
      refName: field.resolvedType?.fullName.slice(1),
      refModelType: getRefModel(field),
      // Inline nested props for records only.
      props:
        type === PropType.RECORD && field.resolvedType instanceof pb.Type && !isObject(field.resolvedType) && depth > 0
          ? getProps(field.resolvedType, depth - 1)
          : undefined,
      variants:
        field.resolvedType instanceof pb.Enum
          ? Object.entries(field.resolvedType.values).map(([name, tag]) => ({ name, tag }))
          : undefined,
    };
  });
};

export const createProtoSchema = (type: pb.Type): SchemaProps => {
  return {
    typename: type.fullName.slice(1),
    props: getProps(type),
  };
};

const getPropType = (field: pb.Field): PropType => {
  if (field.resolvedType) {
    if (field.resolvedType instanceof pb.Enum) {
      return PropType.ENUM;
    } else if (isObject(field.resolvedType) || isTextObject(field.type)) {
      return PropType.REF;
    } else {
      return PropType.RECORD;
    }
  }

  switch (field.type) {
    case 'double':
    case 'float':
    case 'int32':
    case 'uint32':
    case 'sint32':
    case 'fixed32':
    case 'sfixed32':
    case 'int64':
    case 'uint64':
    case 'sint64':
    case 'fixed64':
    case 'sfixed64':
      return PropType.NUMBER;
    case 'string':
      return PropType.STRING;
    case 'bool':
      return PropType.BOOLEAN;
    case 'bytes':
    default:
      return PropType.NONE;
  }
};

const isTextObject = (typeName: string) => typeName.split('.').at(-1) === 'Text';

const getRefModel = (field: pb.Field): string | undefined => {
  if (isTextObject(field.type)) {
    return 'dxos.org/model/text';
  } else if (field.resolvedType && field.resolvedType.options && field.resolvedType.options['(object)']) {
    return 'dxos.org/model/document';
  } else {
    return undefined;
  }
};

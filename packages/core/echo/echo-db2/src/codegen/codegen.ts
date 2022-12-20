import * as pb from "protobufjs";
import * as ts from "typescript";

const f = ts.factory;

export function codegenSchema(
  schema: pb.Root
) {
  return `const schemaJson = ${JSON.stringify(JSON.stringify(schema.toJSON()))}\n`;
}

export function *iterTypes(ns: pb.NamespaceBase): IterableIterator<pb.Type> {
  for(const type of ns.nestedArray) {
    if(type instanceof pb.Type) {
      yield type;
    } 

    if(type instanceof pb.Type || type instanceof pb.Namespace) {
      yield* iterTypes(type);
    }
  }
}

function codegenType(field: pb.Field): string {
  function scalar() {
    if(field.resolvedType) {
      return field.resolvedType.name;
    } else {
      switch(field.type) {
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
          throw new Error(`Unknown field type: ${field.type}`);
      }
    }
  }

  field.resolve();
  if(field.repeated) {
    if(field.resolvedType) {
      return `OrderedSet<${scalar()}>`;
    } else {
      return `Set<${scalar()}>`;
    }
  } else {
    return scalar();
  }
}

export function codegenClass(type: pb.Type) {
  const name = type.name;
  const fullName = type.fullName.slice(1);

  const initializer = type.fieldsArray
    .filter(field => field.name !== 'id')
    .map(field => `${field.name}?: ${codegenType(field)}`)
    .join(',')

  const fields = type.fieldsArray
    .filter(field => field.name !== 'id')
    .map(field => `declare ${field.name}: ${codegenType(field)};`)
    .join('\n')

  return `
    export class ${name} extends EchoObjectBase {
      static readonly type = schema.getType('${fullName}');

      static filter(opts?: { ${initializer} }): TypeFilter<${name}> {
        return ${name}.type.createFilter(opts);
      }

      constructor(opts?: { ${initializer} }) {
        super({ ...opts, '@type': ${name}.type.name }, ${name}.type);
      }
    
      ${fields}
    }
    schema.registerPrototype(${name});
  `
}

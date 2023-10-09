//
// Copyright 2022 DXOS.org
//

import * as pb from 'protobufjs';

import { DocumentModel } from '@dxos/document-model';
import { invariant } from '@dxos/invariant';
import { TextModel } from '@dxos/text-model';
import { stripUndefinedValues } from '@dxos/util';
import type { SchemaProps, Schema as SchemaProto } from './proto';

import { immutable } from './defs';
import { TypeFilter } from './query';
import { dangerouslyMutateImmutableObject } from './typed-object';

/**
 * @deprecated
 */
export type EchoType =
  | {
    kind: 'number' | 'string' | 'boolean' | 'bytes';
  }
  | {
    /**
     * Plain JS object.
     */
    kind: 'record';
    objectType: string;
    // TODO(mykola): Add ability to list fields.
  }
  | {
    kind: 'ref';
    objectType: string;
    modelType: string;
  }
  | {
    kind: 'array';
    elementType: EchoType;
  }
  | {
    kind: 'enum';
    enumType: string;
    // TODO(mykola): Add ability to list enum values.
  };

/**
 * @deprecated
 */
export type EchoSchemaField = {
  name: string;
  type: EchoType;
  options?: Record<string, any>;
};

/**
 * Wraps protocol generated type.
 * @deprecated
 */
// TODO(burdon): Rename SchemaType (since part of API).
export class EchoSchemaType {
  public readonly fields: EchoSchemaField[] = [];

  constructor(private readonly _type: pb.Type) {
    this.fields = getFields(_type);
  }

  // Compat with runtime schemas.
  get [immutable]() {
    return true;
  }

  get name() {
    return this._type.fullName.slice(1);
  }

  get shortName() {
    return this._type.name;
  }

  createFilter(opts?: any): TypeFilter<any> {
    return {
      ...stripUndefinedValues(opts),
      '@type': this.name,
    };
  }
}

type Prototype = {
  new(...args: any): any;
  schema: SchemaProto;
};

/**
 * Constructed via generated protobuf class.
 */
export class TypeCollection {
  private readonly _prototypes = new Map<string, Prototype>();
  private readonly _types = new Map<string, SchemaProto>();
  private readonly _schemaDefs = new Map<string, SchemaProps>();

  /**
   * @deprecated
   */
  static fromJson(json: string): TypeCollection {
    return new TypeCollection(pb.Root.fromJSON(JSON.parse(json)));
  }

  constructor(private readonly _root: pb.Root = new pb.Root()) { }

  /**
   * @deprecated
   */
  get types() {
    return Array.from(this._prototypes.keys()).map((name) => this.getType(name));
  }

  /**
   * @deprecated
   */
  getType(name: string): EchoSchemaType {
    return new EchoSchemaType(this._root.lookupType(name));
  }

  mergeSchema(schema: TypeCollection) {
    const rootToMerge = filterNamespaces({ base: this._root, toFilter: schema._root });
    rootToMerge.nestedArray.forEach((nested) => {
      this._root.add(nested);
    });
    Array.from(schema._prototypes.entries()).forEach(([name, prototype]) => {
      invariant(!this._prototypes.has(name), 'Names collision');
      this._prototypes.set(name, prototype);
    });
  }

  /**
   * Called from generated code.
   */
  registerPrototype(proto: Prototype, schema: SchemaProps) {
    this._prototypes.set(schema.typename, proto);
    this._schemaDefs.set(schema.typename, schema);
  }

  getPrototype(name: string): Prototype | undefined {
    return this._prototypes.get(name);
  }


  /**
   * Resolve cross-schema references.
   */
  link() {
    if (deferLink) { // Circular dependency hack.
      return;
    }

    const { Schema } = require('./proto');
    invariant(Schema, 'Circular dependency error');

    // Create immutable schema objects.
    for (const def of this._schemaDefs.values()) {
      const schema = new Schema(def, { immutable: true });
      this._types.set(schema.typename, schema);
    }

    // Link.
    dangerouslyMutateImmutableObject(() => {
      for (const type of this._types.values()) {
        for (const field of type.props) {
          if (field.refName) {
            if (this._types.has(field.refName)) {
              field.ref = this._types.get(field.refName);
            }
          }
        }

        const proto = this._prototypes.get(type.typename);
        invariant(proto, 'Missing prototype');
        proto.schema = type;
      }
    })

    for (const [typename, proto] of this._prototypes) {
      const schema = this._types.get(typename);
      invariant(schema);
      proto.schema = schema;
    }
  }
}

let deferLink = true;

/**
 * Call after module code has loaded to avoid circular dependency errors.
 */
export const linkDeferred = () => {
  deferLink = false;
  const { schemaBuiltin } = require('./proto');
  schemaBuiltin.link();

}

/**
 * Deletes `namespacesToRemove` from `toFilter` that are already present in `base`.
 */
const filterNamespaces = ({
  base,
  toFilter,
  namespacesToRemove = ['.dxos.schema'],
}: {
  base: pb.Root;
  toFilter: pb.Root;
  namespacesToRemove?: string[];
}) => {
  const filtered = pb.Root.fromJSON(toFilter.toJSON());

  namespacesToRemove.forEach((namespace) => {
    const isNamespacePresent = !!base.lookup(namespace);
    const namespaceToRemove = filtered.lookup(namespace);

    if (isNamespacePresent && namespaceToRemove) {
      const parentNamespace = namespace.split('.').slice(0, -1).join('.');
      const parent = filtered.lookup(parentNamespace);
      (parent as pb.Namespace)?.remove(namespaceToRemove);
    }
  });

  return filtered;
};

const getFields = (type: pb.Type): EchoSchemaField[] => {
  type.fieldsArray.forEach((field) => field.resolve());
  return type.fieldsArray.map((field) => {
    const echoField: EchoSchemaField = {
      name: field.name,
      type: getEchoType(field),
    };
    if (field.options) {
      echoField.options = field.options;
    }
    return echoField;
  });
};

const getEchoType = (field: pb.Field): EchoType => {
  if (field.resolvedType) {
    if (field.repeated) {
      return { kind: 'array', elementType: getComplexType(field.resolvedType) };
    } else {
      return getComplexType(field.resolvedType);
    }
  }

  if (field.repeated) {
    return { kind: 'array', elementType: getBasicType(field.type) };
  } else {
    return getBasicType(field.type);
  }
};

const getComplexType = (type: pb.Type | pb.Enum): EchoType => {
  if (type instanceof pb.Enum) {
    return { kind: 'enum', enumType: type.fullName.slice(1) };
  } else if (type instanceof pb.Type) {
    if (isTextObject(type.fullName)) {
      return {
        kind: 'ref',
        objectType: type.fullName.slice(1),
        modelType: TextModel.meta.type,
      };
    } else if (type.options && type.options['(object)']) {
      return {
        kind: 'ref',
        objectType: type.fullName.slice(1),
        modelType: DocumentModel.meta.type,
      };
    } else {
      return { kind: 'record', objectType: type.fullName.slice(1) };
    }
  }

  throw new Error(`Unknown type: ${type}`);
};

const getBasicType = (type: string): EchoType => {
  switch (type) {
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
      return { kind: 'number' };
    case 'string':
      return { kind: 'string' };
    case 'bytes':
      return { kind: 'bytes' };
    case 'bool':
      return { kind: 'boolean' };
    default:
      throw new Error(`Unknown type: ${type}`);
  }
};

const isTextObject = (typeName: string) => typeName.split('.').at(-1) === 'Text';

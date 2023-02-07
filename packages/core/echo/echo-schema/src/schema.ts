//
// Copyright 2022 DXOS.org
//

import * as pb from 'protobufjs';

import { TypeFilter } from './database';
import { strip } from './util';

export type EchoType =
  | {
      kind: 'number' | 'string' | 'boolean' | 'bytes';
    }
  | {
      /**
       * Plain JS object.
       */
      kind: 'record'; // TODO(mykola) Figure out a better name.
      objectType: string;
      // TODO(mykola): Add ability to list fields.
    }
  | {
      kind: 'ref';
      objectType: string;
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

export type EchoSchemaField = {
  name: string;
  type: EchoType;
};

const getFields = (type: pb.Type): EchoSchemaField[] => {
  type.fieldsArray.forEach((field) => field.resolve());

  return type.fieldsArray.map((field) => {
    const getComplexType = (type: pb.Type | pb.Enum): EchoType => {
      if (type instanceof pb.Enum) {
        return { kind: 'enum', enumType: type.fullName.slice(1) };
      } else if (type instanceof pb.Type) {
        if (type.options && type.options['(object)']) {
          return { kind: 'ref', objectType: type.fullName.slice(1) };
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

    return {
      name: field.name,
      type: getEchoType(field)
    };
  });
};

/**
 * Wraps protocol generated type.
 */
export class EchoSchemaType {
  public readonly fields: EchoSchemaField[] = [];

  // prettier-ignore
  constructor(
    private readonly _type: pb.Type
  ) {
    this.fields = getFields(_type);
  }

  get name() {
    return this._type.fullName.slice(1);
  }

  get shortName() {
    return this._type.name;
  }

  createFilter(opts?: any): TypeFilter<any> {
    return {
      ...strip(opts),
      '@type': this.name
    };
  }
}

type Prototype = {
  new (...args: any): any;
  type: EchoSchemaType;
};

/**
 * Constructed via generated protobuf class.
 */
export class EchoSchema {
  private readonly _prototypes = new Map<string, Prototype>();

  static fromJson(json: string): EchoSchema {
    return new EchoSchema(pb.Root.fromJSON(JSON.parse(json)));
  }

  // prettier-ignore
  constructor(
    private readonly _root: pb.Root
  ) {}

  getType(name: string): EchoSchemaType {
    return new EchoSchemaType(this._root.lookupType(name));
  }

  /**
   * Called from generated code.
   */
  registerPrototype(proto: Prototype) {
    this._prototypes.set(proto.type.name, proto);
  }

  getPrototype(name: string): Prototype | undefined {
    return this._prototypes.get(name);
  }
}

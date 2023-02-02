//
// Copyright 2022 DXOS.org
//

import * as pb from 'protobufjs';

import { TypeFilter } from './database';
import { strip } from './util';

export enum FieldType {
  NUMBER = 'number',
  BYTES = 'bytes',
  STRING = 'string',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
  ARRAY = 'array'
}

export type EchoSchemaField = {
  // TODO(mykola): Add Enums support.
  name: string;
  type: FieldType;
  typeName: string;
  nestedFields?: EchoSchemaField[] | 'basic-type' | 'cyclic-type' | 'enum';
};

const getFields = (type: pb.Type, typeStack: string[] = []): EchoSchemaField[] => {
  type.fieldsArray.forEach((field) => field.resolve());

  return type.fieldsArray.map((field) => {
    let type: FieldType;
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
        type = FieldType.NUMBER;
        break;
      case 'string':
        type = FieldType.STRING;
        break;
      case 'bytes':
        type = FieldType.BYTES;
        break;
      case 'bool':
        type = FieldType.BOOLEAN;
        break;
      default:
        if (field.repeated) {
          type = FieldType.ARRAY;
        } else {
          type = FieldType.OBJECT;
        }
    }

    let nestedFields: EchoSchemaField[] | 'basic-type' | 'cyclic-type' | 'enum';
    switch (field.resolvedType?.constructor) {
      case pb.Enum:
        nestedFields = 'enum';
        break;
      case pb.Type:
        nestedFields = !typeStack.includes(field.type)
          ? getFields(field.resolvedType as pb.Type, [...typeStack, field.type])
          : 'cyclic-type';
        break;
      default:
        nestedFields = 'basic-type';
    }

    return {
      name: field.name,
      type,
      typeName: field.type,
      nestedFields
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

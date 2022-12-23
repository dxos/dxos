//
// Copyright 2022 DXOS.org
//

import * as pb from 'protobufjs';

import { Filter } from './database';
import { EchoObject } from './object';

export type EchoSchemaField = {
  name: string;
  isOrderedSet?: boolean;
};

// TODO(burdon): __phantom?
export type TypeFilter<T extends EchoObject> = { __phantom: T } & Filter;

/**
 *
 */
export class EchoSchema {
  constructor(private readonly _root: pb.Root) {}

  static fromJson(json: string): EchoSchema {
    return new EchoSchema(pb.Root.fromJSON(JSON.parse(json)));
  }

  getType(name: string): EchoSchemaType {
    return new EchoSchemaType(this._root.lookupType(name));
  }

  // TODO(burdon): ?
  registerPrototype(proto: any) {}
}

/**
 *
 */
export class EchoSchemaType {
  public readonly fields: EchoSchemaField[] = [];

  constructor(private readonly _type: pb.Type) {
    _type.fieldsArray.forEach((field) => field.resolve());
    this.fields = _type.fieldsArray.map((field) => ({
      name: field.name,
      isOrderedSet: field.repeated && field.resolvedType !== null
    }));
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

const strip = (obj: any): any => {
  if (typeof obj === 'object') {
    Object.keys(obj).forEach((key) => obj[key] === undefined && delete obj[key]);
  }

  return obj;
};

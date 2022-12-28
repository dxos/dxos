//
// Copyright 2022 DXOS.org
//

import * as pb from 'protobufjs';

import { TypeFilter } from './database';
import { strip } from './util';

export type EchoSchemaField = {
  name: string;
  // TODO(burdon): Replace with enum for type.
  isOrderedSet?: boolean;
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

/**
 * Constructed via generated protobuf class.
 */
export class EchoSchema {
  // prettier-ignore
  constructor(
    private readonly _root: pb.Root
  ) {}

  static fromJson(json: string): EchoSchema {
    return new EchoSchema(pb.Root.fromJSON(JSON.parse(json)));
  }

  getType(name: string): EchoSchemaType {
    return new EchoSchemaType(this._root.lookupType(name));
  }

  // TODO(burdon): Document.
  registerPrototype(proto: any) {}
}

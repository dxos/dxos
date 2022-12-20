import * as pb from 'protobufjs'
import { Filter } from './database';

export class EchoSchema {
  constructor(
    private readonly _root: pb.Root,
  ) {}

  static fromJson(json: string): EchoSchema {
    return new EchoSchema(pb.Root.fromJSON(JSON.parse(json)));
  }

  getType(name: string): EchoSchemaType {
    return new EchoSchemaType(this._root.lookupType(name));
  }

  registerPrototype(proto: any) {

  }
}

export class EchoSchemaType {
  constructor(
    private readonly _type: pb.Type,
  ) {}

  get name() {
    return this._type.fullName.slice(1);
  }

  createFilter(opts?: any): TypeFilter<any> {
    return {
      ...opts,
      '@type': this.name,
    }
  }
}

export type TypeFilter<T> = Filter

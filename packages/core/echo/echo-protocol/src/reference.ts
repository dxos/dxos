//
// Copyright 2022 DXOS.org
//

import { DXN, LOCAL_SPACE_TAG } from '@dxos/keys';
import { type ObjectId } from '@dxos/protocols';
import { type Reference as ReferenceProto } from '@dxos/protocols/proto/dxos/echo/model/document';

/**
 * Runtime representation of object reference.
 */
export class Reference {
  /**
   * Protocol references to runtime registered types.
   */
  static TYPE_PROTOCOL = 'protobuf';

  static fromValue(value: ReferenceProto): Reference {
    return new Reference(value.objectId, value.protocol, value.host);
  }

  /**
   * @deprecated
   */
  // TODO(burdon): Document/remove?
  static fromLegacyTypename(type: string): Reference {
    return new Reference(type, Reference.TYPE_PROTOCOL, 'dxos.org');
  }

  static fromDXN(dxn: DXN): Reference {
    switch (dxn.kind) {
      case DXN.kind.TYPE:
        return Reference.fromLegacyTypename(dxn.parts[0]);
      case DXN.kind.ECHO:
        if (dxn.parts[0] === LOCAL_SPACE_TAG) {
          return new Reference(dxn.parts[1]);
        } else {
          return new Reference(dxn.parts[1], undefined, dxn.parts[0]);
        }
      default:
        throw new Error(`Unsupported DXN kind: ${dxn.kind}`);
    }
  }

  // prettier-ignore
  constructor(
    public readonly objectId: ObjectId,
    public readonly protocol?: string,
    public readonly host?: string
  ) {}

  encode(): ReferenceProto {
    return { objectId: this.objectId, host: this.host, protocol: this.protocol };
  }

  toDXN(): DXN {
    if (this.protocol === Reference.TYPE_PROTOCOL) {
      return new DXN(DXN.kind.TYPE, [this.objectId]);
    } else {
      if (this.host) {
        // Host is assumed to be the space key.
        // The DXN should actually have the space ID.
        // TODO(dmaretskyi): Migrate to space id.
        return new DXN(DXN.kind.ECHO, [this.host, this.objectId]);
      } else {
        return new DXN(DXN.kind.ECHO, [LOCAL_SPACE_TAG, this.objectId]);
      }
    }
  }
}

export const REFERENCE_TYPE_TAG = 'dxos.echo.model.document.Reference';

/**
 * Reference as it is stored in Automerge document.
 */
export type EncodedReference = {
  '/': string;
};

export const encodeReference = (reference: Reference): EncodedReference => ({
  '/': reference.toDXN().toString(),
});

export const decodeReference = (value: any) => Reference.fromDXN(DXN.parse(value['/']));

export const isEncodedReference = (value: any): value is EncodedReference =>
  typeof value === 'object' && value !== null && Object.keys(value).length === 1 && typeof value['/'] === 'string';

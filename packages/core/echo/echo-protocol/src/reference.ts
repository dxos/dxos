//
// Copyright 2022 DXOS.org
//

import { DXN, LOCAL_SPACE_TAG } from '@dxos/keys';
import { type ItemID } from '@dxos/protocols';
import { type Reference as ReferenceValue } from '@dxos/protocols/proto/dxos/echo/model/document';

// TODO(burdon): Comment.
export class Reference {
  /**
   * Protocol references to runtime registered types.
   */
  static TYPE_PROTOCOL = 'protobuf';

  static fromValue(value: ReferenceValue): Reference {
    return new Reference(value.itemId, value.protocol, value.host);
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
    // TODO(burdon): Change to objectId (and typename).
    public readonly itemId: ItemID,
    public readonly protocol?: string,
    public readonly host?: string
  ) {}

  encode(): ReferenceValue {
    return { itemId: this.itemId, host: this.host, protocol: this.protocol };
  }

  toDXN(): DXN {
    if (this.protocol === Reference.TYPE_PROTOCOL) {
      return new DXN(DXN.kind.TYPE, [this.itemId]);
    } else {
      if (this.host) {
        // Host is assumed to be the space key.
        // The DXN should actually have the space ID.
        // TODO(dmaretskyi): Migrate to space id.
        return new DXN(DXN.kind.ECHO, [this.host, this.itemId]);
      } else {
        return new DXN(DXN.kind.ECHO, [LOCAL_SPACE_TAG, this.itemId]);
      }
    }
  }
}

export const REFERENCE_TYPE_TAG = 'dxos.echo.model.document.Reference';

/**
 * Reference as it is stored in Automerge document.
 */
export type EncodedReferenceObject = {
  '/': string;
};

export const encodeReference = (reference: Reference): EncodedReferenceObject => ({
  '/': reference.toDXN().toString(),
});

export const decodeReference = (value: any) => Reference.fromDXN(DXN.parse(value['/']));

export const isEncodedReferenceObject = (value: any): value is EncodedReferenceObject =>
  typeof value === 'object' && value !== null && Object.keys(value).length === 1 && typeof value['/'] === 'string';

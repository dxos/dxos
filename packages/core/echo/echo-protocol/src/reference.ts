//
// Copyright 2022 DXOS.org
//

import { assertArgument } from '@dxos/invariant';
import { DXN, LOCAL_SPACE_TAG, type PublicKey } from '@dxos/keys';
import { type ObjectId } from '@dxos/protocols';
import { type Reference as ReferenceProto } from '@dxos/protocols/proto/dxos/echo/model/document';

/**
 * Runtime representation of an reference in ECHO.
 * Implemented as a DXN, but we might extend it to other URIs in the future.
 * @deprecated Use `EncodedReference` instead.
 */
export class Reference {
  /**
   * Protocol references to runtime registered types.
   * @deprecated
   */
  static TYPE_PROTOCOL = 'protobuf';

  static fromDXN(dxn: DXN): Reference {
    switch (dxn.kind) {
      case DXN.kind.TYPE:
        return new Reference(dxn.parts[0], Reference.TYPE_PROTOCOL, 'dxos.org', dxn);
      case DXN.kind.ECHO:
        if (dxn.parts[0] === LOCAL_SPACE_TAG) {
          return new Reference(dxn.parts[1], undefined, undefined, dxn);
        } else {
          return new Reference(dxn.parts[1], undefined, dxn.parts[0], dxn);
        }
      default:
        return new Reference(dxn.parts[0], undefined, dxn.parts[0], dxn);
    }
  }

  static fromValue(value: ReferenceProto): Reference {
    return new Reference(value.objectId, value.protocol, value.host);
  }

  /**
   * Reference an object in the local space.
   */
  static localObjectReference(objectId: ObjectId): Reference {
    return new Reference(objectId);
  }

  /**
   * @deprecated
   */
  // TODO(dmaretskyi): Remove.
  static fromLegacyTypename(type: string): Reference {
    return new Reference(type, Reference.TYPE_PROTOCOL, 'dxos.org');
  }

  /**
   * @deprecated
   */
  // TODO(dmaretskyi): Remove
  static fromObjectIdAndSpaceKey(objectId: ObjectId, spaceKey: PublicKey): Reference {
    // TODO(dmaretskyi): FIX ME! This should be a space ID not a space key.
    return new Reference(objectId, undefined, spaceKey.toHex());
  }

  // prettier-ignore
  private constructor(
    // TODO(dmaretskyi): Remove and just leave DXN.
    private readonly _objectId: ObjectId,
    private readonly _protocol?: string,
    private readonly _host?: string,
    private readonly _dxn?: DXN,
  ) {}

  get dxn(): DXN | undefined {
    return this._dxn;
  }

  /**
   * @deprecated
   */
  // TODO(dmaretskyi): Remove.
  get objectId(): ObjectId {
    return this._objectId;
  }

  /**
   * @deprecated
   */
  // TODO(dmaretskyi): Remove.
  get protocol(): string | undefined {
    return this._protocol;
  }

  /**
   * @deprecated
   */
  // TODO(dmaretskyi): Remove.
  get host(): string | undefined {
    return this._host;
  }

  encode(): ReferenceProto {
    return { objectId: this.objectId, host: this.host, protocol: this.protocol };
  }

  // TODO(dmaretskyi): Remove in favor of `reference.dxn`.
  toDXN(): DXN {
    if (this._dxn) {
      return this._dxn;
    }

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

// TODO(dmaretskyi): Is this used anywhere?
export const REFERENCE_TYPE_TAG = 'dxos.echo.model.document.Reference';

/**
 * Reference as it is stored in Automerge document.
 */
export type EncodedReference = {
  '/': string;
};

/**
 * @deprecated Use `EncodedReference.fromDXN` instead.
 */
export const encodeReference = (reference: Reference): EncodedReference => ({
  '/': reference.toDXN().toString(),
});

/**
 * @deprecated Use `EncodedReference.toDXN` instead.
 */
export const decodeReference = (value: any) => {
  if (typeof value !== 'object' || value === null || typeof value['/'] !== 'string') {
    throw new Error('Invalid reference');
  }
  const dxnString = value['/'];

  if (
    dxnString.length % 2 === 0 &&
    dxnString.slice(0, dxnString.length / 2) === dxnString.slice(dxnString.length / 2) &&
    dxnString.includes('dxn:echo')
  ) {
    throw new Error('Automerge bug detected!');
  }

  return Reference.fromDXN(DXN.parse(dxnString));
};

/**
 * @deprecated Use `EncodedReference.isEncodedReference` instead.
 */
export const isEncodedReference = (value: any): value is EncodedReference =>
  typeof value === 'object' && value !== null && Object.keys(value).length === 1 && typeof value['/'] === 'string';

export const EncodedReference = Object.freeze({
  isEncodedReference,
  getReferenceString: (value: EncodedReference): string => {
    assertArgument(isEncodedReference(value), 'value', 'invalid reference');
    return value['/'];
  },
  toDXN: (value: EncodedReference): DXN => {
    return DXN.parse(EncodedReference.getReferenceString(value));
  },
  fromDXN: (dxn: DXN): EncodedReference => {
    return { '/': dxn.toString() };
  },
  fromLegacyTypename: (typename: string): EncodedReference => {
    return { '/': DXN.fromTypename(typename).toString() };
  },
});

//
// Copyright 2022 DXOS.org
//

import { assertArgument } from '@dxos/invariant';
import { DXN, EchoId, type PublicKey, type URI } from '@dxos/keys';
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

  static fromDXN(dxn: string): Reference {
    // Try EchoId first (object references).
    const echoId = EchoId.tryParse(dxn);
    if (echoId) {
      const spaceId = EchoId.getSpaceId(echoId);
      const objectId = EchoId.getObjectId(echoId);
      if (spaceId && objectId) {
        return new Reference(objectId as ObjectId, undefined, spaceId);
      }
      if (objectId) {
        return new Reference(objectId as ObjectId, undefined, undefined);
      }
    }

    // Try DXN (type references).
    const typeDxn = DXN.tryParse(dxn);
    if (typeDxn) {
      const nsid = DXN.getNsid(typeDxn);
      return new Reference(nsid as ObjectId, Reference.TYPE_PROTOCOL, 'dxos.org');
    }

    throw new Error(`Invalid DXN: ${dxn}`);
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
  ) {}

  /**
   * Returns the reference as a URI string.
   * For type references: `dxn:<nsid>`
   * For object references: `echo://<space>/<object>` or `echo:/<object>`
   */
  get uri(): URI.URI | undefined {
    if (this._protocol === Reference.TYPE_PROTOCOL) {
      return DXN.fromTypename(this._objectId) as unknown as URI.URI;
    }
    if (this._host) {
      return EchoId.fromSpaceAndObjectId(this._host as any, this._objectId) as unknown as URI.URI;
    }
    return EchoId.fromLocalObjectId(this._objectId) as unknown as URI.URI;
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

  // TODO(dmaretskyi): Remove in favor of `reference.uri`.
  toDXN(): string {
    return this.uri ?? EchoId.fromLocalObjectId(this._objectId);
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
 * @deprecated Use `EncodedReference.fromEchoId` or `EncodedReference.fromDXNNew` instead.
 */
export const encodeReference = (reference: Reference): EncodedReference => ({
  '/': reference.toDXN(),
});

/**
 * @deprecated Use `EncodedReference.toEchoId` or `EncodedReference.toDXNNew` instead.
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

  return Reference.fromDXN(dxnString);
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
  /**
   * Returns the URI string stored in the encoded reference (opaque, any scheme).
   */
  getURI: (value: EncodedReference): URI.URI => {
    assertArgument(isEncodedReference(value), 'value', 'invalid reference');
    return value['/'] as URI.URI;
  },
  /**
   * @deprecated Use `EncodedReference.toEchoId` for object refs or `EncodedReference.toDXNNew` for type refs.
   * Returns the raw string stored in the encoded reference.
   */
  toDXN: (value: EncodedReference): string => {
    return EncodedReference.getReferenceString(value);
  },
  /**
   * @deprecated Use `EncodedReference.fromEchoId` for object refs or `EncodedReference.fromDXNNew` for type refs.
   */
  fromDXN: (dxn: string): EncodedReference => {
    return { '/': dxn };
  },
  /**
   * Parses the encoded reference as an EchoId, normalizing any legacy `dxn:echo:` or `dxn:queue:` formats.
   */
  toEchoId: (value: EncodedReference): EchoId.EchoId => {
    return EchoId.parse(EncodedReference.getReferenceString(value));
  },
  /**
   * Creates an encoded reference from an EchoId.
   */
  fromEchoId: (id: EchoId.EchoId): EncodedReference => {
    return { '/': id };
  },
  /**
   * Parses the encoded reference as a new-format DXN, normalizing any legacy `dxn:type:` prefix.
   */
  toDXNNew: (value: EncodedReference): DXN.DXN => {
    return DXN.parse(EncodedReference.getReferenceString(value));
  },
  /**
   * Creates an encoded reference from a new-format DXN.
   */
  fromDXNNew: (dxn: DXN.DXN): EncodedReference => {
    return { '/': dxn };
  },
  fromLegacyTypename: (typename: string): EncodedReference => {
    return { '/': DXN.fromTypename(typename) };
  },
});

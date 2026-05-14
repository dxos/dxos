//
// Copyright 2022 DXOS.org
//

import { assertArgument } from '@dxos/invariant';
import { DXN, EchoId, type PublicKey, URI } from '@dxos/keys';
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
}

// TODO(dmaretskyi): Is this used anywhere?
export const REFERENCE_TYPE_TAG = 'dxos.echo.model.document.Reference';

/**
 * Reference as it is stored in Automerge document.
 */
export type EncodedReference = {
  '/': string;
};

export const isEncodedReference = (value: any): value is EncodedReference =>
  typeof value === 'object' && value !== null && Object.keys(value).length === 1 && typeof value['/'] === 'string';

export const EncodedReference = Object.freeze({
  isEncodedReference,
  getReferenceString: (value: EncodedReference): string => {
    assertArgument(isEncodedReference(value), 'value', 'invalid reference');
    return value['/'];
  },
  /**
   * Returns the opaque URI stored in the encoded reference (any scheme: `echo:` or `dxn:`).
   */
  toURI: (value: EncodedReference): URI.URI => {
    assertArgument(isEncodedReference(value), 'value', 'invalid reference');
    return URI.make(value['/']);
  },
  /**
   * Creates an encoded reference from an opaque URI.
   */
  fromURI: (uri: URI.URI): EncodedReference => {
    return { '/': uri };
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
   * Parses the encoded reference as a DXN, normalizing any legacy `dxn:type:` prefix.
   */
  toDXN: (value: EncodedReference): DXN.DXN => {
    return DXN.parse(EncodedReference.getReferenceString(value));
  },
  /**
   * Creates an encoded reference from a DXN.
   */
  fromDXN: (dxn: DXN.DXN): EncodedReference => {
    return { '/': dxn };
  },
  fromLegacyTypename: (typename: string): EncodedReference => {
    return { '/': DXN.fromTypename(typename) };
  },
});

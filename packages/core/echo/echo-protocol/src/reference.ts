//
// Copyright 2022 DXOS.org
//

import { assertArgument } from '@dxos/invariant';
import { DXN, EID, URI } from '@dxos/keys';

// TODO(dmaretskyi): Is this used anywhere?
export const REFERENCE_TYPE_TAG = 'dxos.echo.model.document.Reference';

/**
 * Reference as it is stored in Automerge document.
 */
export type EncodedReference = {
  '/': URI.URI;
};

export const isEncodedReference = (value: any): value is EncodedReference =>
  typeof value === 'object' && value !== null && Object.keys(value).length === 1 && typeof value['/'] === 'string';

export const EncodedReference = Object.freeze({
  isEncodedReference,
  /**
   * Returns the opaque URI stored in the encoded reference (any scheme: `echo:` or `dxn:`).
   * Consumers can narrow with `EID.isEID(uri)` / `DXN.isDXN(uri)`.
   */
  toURI: (value: EncodedReference): URI.URI => {
    assertArgument(isEncodedReference(value), 'value', 'invalid reference');
    return value['/'];
  },
  /**
   * Creates an encoded reference from an opaque URI.
   */
  fromURI: (uri: URI.URI): EncodedReference => {
    return { '/': uri };
  },
});

/**
 * Normalizes a reference URI so every spelling of the same target shares one key: an echo
 * reference by its local (space-less) form, a named-entity `dxn:` by its unversioned NSID. The
 * reverse-ref index and in-memory reference matching both compare on it.
 */
export const referenceIndexKey = (uri: URI.URI): URI.URI | undefined => {
  const parsedEchoUri = EID.tryParse(uri);
  if (parsedEchoUri) {
    return EID.getEntityId(parsedEchoUri) ? EID.toLocal(parsedEchoUri) : undefined;
  }
  if (DXN.isDXN(uri)) {
    return DXN.tryMake(uri) ? DXN.make<string>(DXN.getName(uri)) : undefined;
  }
  return uri;
};

//
// Copyright 2022 DXOS.org
//

import { assertArgument } from '@dxos/invariant';
import { URI } from '@dxos/keys';

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

//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

/**
 * Branded string type for any URI.
 * Base type for more specific URI schemes like DXN and EID.
 */
export type URI = string & { readonly __URI: unique symbol };

/**
 * Brand a string as an opaque URI without validating the scheme.
 * For typed construction prefer `DXN.make`, `EID.make`, etc.
 */
export const make = (uri: string): URI => uri as URI;

/**
 * Returns true if the value looks like a URI (string with a scheme prefix).
 */
export const isURI = (value: unknown): value is URI =>
  typeof value === 'string' && /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value);

/**
 * Effect Schema for any URI string.
 */
// Identity-encoded `Schema<URI, URI>` so consumers can refine without the encode/decode
// types diverging. Runtime representation is identical (a branded string).
const Schema_: Schema.Schema<URI, URI> = Schema.String.pipe(
  Schema.filter((value): value is URI => isURI(value), { message: () => 'Invalid URI' }),
) as unknown as Schema.Schema<URI, URI>;
export { Schema_ as Schema };

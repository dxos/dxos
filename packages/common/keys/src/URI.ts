//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

/**
 * Branded string type for any URI.
 * Base type for more specific URI schemes like DXN and EchoURI.
 */
export type URI = string & { readonly __URI: unique symbol };

/**
 * Brand a string as an opaque URI without validating the scheme.
 * For typed construction prefer `DXN.make`, `EchoURI.fromSpaceAndObjectId`, etc.
 */
export const make = (uri: string): URI => uri as URI;

/**
 * Returns true if the value looks like a URI (string with a scheme prefix).
 */
export const isURI = (value: unknown): value is URI =>
  typeof value === 'string' && /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value);

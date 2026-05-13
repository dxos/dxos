//
// Copyright 2025 DXOS.org
//

/**
 * Branded string type for any URI.
 * Base type for more specific URI schemes like DXN and EchoId.
 */
export type URI = string & { readonly __URI: unique symbol };

//
// Copyright 2026 DXOS.org
//

// Latin-1 round-trips every byte, so an 8-bit body survives decode and re-encode unchanged.

/** Decodes Gmail's base64url `raw` field into an RFC 5322 message. */
export const decodeRaw = (raw: string): string => Buffer.from(raw, 'base64url').toString('latin1');

/** Encodes an RFC 5322 message for Gmail's base64url `raw` field. */
export const encodeRaw = (message: string): string => Buffer.from(message, 'latin1').toString('base64url');

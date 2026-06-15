//
// Copyright 2026 DXOS.org
//

const SEPARATOR = ':';

/**
 * Build a composite key from string parts joined by a colon separator.
 * Parts must not contain the separator character.
 */
export const compositeKey = (...parts: string[]): string => parts.join(SEPARATOR);

/**
 * Split a composite key back into its parts.
 */
export const splitCompositeKey = (key: string): string[] => key.split(SEPARATOR);

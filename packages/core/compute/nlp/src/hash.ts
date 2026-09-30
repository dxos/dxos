//
// Copyright 2026 DXOS.org
//
import { fnv1a32 } from '@dxos/util';

/**
 * Fast non-cryptographic hash (FNV-1a, 32-bit) of source text. Used purely to detect whether an
 * analyzed span still matches the current editor text — change detection, not security.
 */
export const sourceHash = (text: string): string => fnv1a32(text).toString(16).padStart(8, '0');

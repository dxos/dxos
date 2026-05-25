//
// Copyright 2026 DXOS.org
//

/**
 * Flat intersection of up to five types. Behaves like `A & B & C & ...` but
 * formats as a comma-separated tuple, which fits multi-line layouts more
 * cleanly than chained `&` operators. Unused slots default to `unknown`,
 * which is inert under intersection (`T & unknown = T`).
 */
export type Merge<A, B = unknown, C = unknown, D = unknown, E = unknown> = A & B & C & D & E;

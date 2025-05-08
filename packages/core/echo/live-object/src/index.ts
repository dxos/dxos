//
// Copyright 2024 DXOS.org
//

export * from './proxy';
export * from './accessors';
export * from './object';
export * from './schema';
export * from './live';

// TODO(dmaretskyi): Remove deprecated exports.
import { Ref } from '@dxos/echo-schema';

/**
 * @deprecated Use {@link Ref.make} instead.
 */
export const makeRef = Ref.make;

/**
 * @deprecated Use {@link Ref.fromDXN} instead.
 */
export const refFromDXN = Ref.fromDXN;

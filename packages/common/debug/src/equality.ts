//
// Copyright 2023 DXOS.org
//

export const equalsSymbol = Symbol.for('dxos.common.equals');

export interface Equatable {
  [equalsSymbol]: (other: any) => boolean;
}

// TODO(dmaretskyi): export to @dxos/traits.
// TODO(dmaretskyi): Hash trait for maps?

export const isEquatable = (value: any): value is Equatable =>
  typeof value === 'object' && value !== null && typeof value[equalsSymbol] === 'function';

export const isEqual = (value: Equatable, other: any) => value[equalsSymbol](other);

/**
 * Feed this as a third argument to `_.isEqualWith` to compare objects with `Equatable` interface.
 */
export const loadashEqualityFn = (value: any, other: any): boolean | undefined => {
  if (!isEquatable(value)) {
    return undefined;
  }
  return isEqual(value, other);
};

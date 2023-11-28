//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Factor out.
export const nonNullable = <T>(value: T): value is NonNullable<T> => value !== null && value !== undefined;

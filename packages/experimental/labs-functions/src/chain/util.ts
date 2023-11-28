//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Factor out.

export const nonNullable = <T>(value: T): value is NonNullable<T> => value !== null && value !== undefined;

export const str = (...text: (string | undefined | boolean)[]): string => text.filter(Boolean).flat().join('\n');

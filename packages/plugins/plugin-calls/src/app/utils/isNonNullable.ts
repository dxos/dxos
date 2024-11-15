//
// Copyright 2024 DXOS.org
//

export default <T>(value: T | null | undefined): value is NonNullable<T> => value !== null && value !== undefined;

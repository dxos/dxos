//
// Copyright 2021 DXOS.org
//

export const isNotNullOrUndefined = <T> (x: T): x is Exclude<T, null | undefined> => x != null;

//
// Copyright 2024 DXOS.org
//

export const isPromiseLike = (value: any): boolean => value != null && typeof value.then === 'function';

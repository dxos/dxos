//
// Copyright 2023 DXOS.org
//

export type MaybePromise<T> = T | Promise<T>;

export const isPromise = <T>(p: any): p is Promise<T> => typeof p?.then === 'function';

export const promise = <T>(o: MaybePromise<T>): Promise<T> => (isPromise(o) ? o : Promise.resolve(o));

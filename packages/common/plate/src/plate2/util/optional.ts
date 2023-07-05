//
// Copyright 2023 DXOS.org
//

export type Optional<T, S extends keyof T> = Omit<T, S> & Partial<Pick<T, S>>;

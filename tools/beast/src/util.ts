//
// Copyright 2022 DXOS.org
//

// TODO(burdon): Factor out.
export const array = <T>(collection: Set<T> | Map<any, T>): T[] => Array.from(collection.values() ?? []);

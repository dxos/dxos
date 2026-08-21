export type Unknown = { readonly __brand: 'obj'; id: string };
export type Snapshot<T> = Omit<T, '__brand'> & { readonly __snap: 'snap' };
export type Database = { getObjectById(id: string): Unknown | undefined };
export type Ref<T> = { target: Unknown | undefined; uri: string };

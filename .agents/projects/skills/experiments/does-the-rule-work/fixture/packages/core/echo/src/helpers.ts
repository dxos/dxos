import type { Database, Snapshot, Unknown } from './types';

export const getDatabase = (obj: Unknown): Database | undefined => undefined;
export const getSnapshot = (obj: Unknown): Snapshot<Unknown> => ({ ...obj }) as Snapshot<Unknown>;
export const isDeleted = (obj: Unknown): boolean => false;
export const getRelationSource = (obj: Unknown): Unknown | undefined => undefined;
export const Atom = { make: <T>(fn: (get: unknown) => T) => ({ read: fn }) };

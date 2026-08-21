import { Atom, getDatabase, getSnapshot, isDeleted } from './helpers';
import type { Ref, Snapshot, Unknown } from './types';

export const objectAtom = <T extends Unknown>(snapshot: Snapshot<T>, live: Unknown) =>
  Atom.make((get) => {
    const db = getDatabase(live);
    if (!db) return undefined;
    const obj = db.getObjectById(live.id);
    return obj ? getSnapshot(obj) : undefined;
  });

export const targetAtom = <T extends Unknown>(ref: Ref<T>) =>
  Atom.make((get) => {
    const target = ref.target;
    if (!target) return undefined;
    return isDeleted(target) ? undefined : getSnapshot(target);
  });

export const parentAtom = <T extends Unknown>(snapshot: Snapshot<T>, live: Unknown) =>
  Atom.make((get) => {
    const db = getDatabase(live);
    const obj = db?.getObjectById(live.id);
    return obj ? getSnapshot(obj) : undefined;
  });

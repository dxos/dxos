import type { BaseObject } from '../types';

export const DeletedSymbol = Symbol.for('@dxos/schema/Deleted');

/**
 * @returns `true` if the object has been marked as deleted.
 */
export const isDeleted = (obj: BaseObject): boolean => {
  if ((obj as any)[DeletedSymbol] === undefined) {
    throw new Error('Object does not support deletion marker');
  }
  return (obj as any)[DeletedSymbol] ?? false;
};

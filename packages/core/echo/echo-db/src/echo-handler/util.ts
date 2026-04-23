//
// Copyright 2023 DXOS.org
//

import { Obj } from '@dxos/echo';
import { type ForeignKey } from '@dxos/echo-protocol';
import { DXN } from '@dxos/keys';

/**
 * @deprecated Use `DXN.fromSpaceAndObjectId(spaceId, obj.id)` instead.
 */
export const getDXNWithSpaceKey = (obj: Obj.Any): DXN | undefined => {
  const db = Obj.getDatabase(obj);
  return db && DXN.fromSpaceAndObjectId(db.spaceId, obj.id);
};

// TODO(burdon): Factor out.
// TODO(burdon): Impl query by meta.
export const findObjectWithForeignKey = <T extends Obj.Unknown>(objects: T[], foreignKey: ForeignKey) => {
  return objects.find((result) => {
    return Obj.getMeta(result).keys.find(({ source, id }) => source === foreignKey.source && id === foreignKey.id);
  });
};

export const matchKeys = (a: ForeignKey[], b: ForeignKey[]): boolean => {
  return a.some((keyA) => b.some((keyB) => keyA.source === keyB.source && keyA.id === keyB.id));
};

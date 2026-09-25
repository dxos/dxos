//
// Copyright 2026 DXOS.org
//

import { EID } from '@dxos/keys';

/**
 * The object id named by `CommentState.current`, whichever spelling it holds — an object id or an
 * EID whose spelling changes when a draft persists (`echo:///<id>` → `echo://<spaceId>/<id>`).
 */
export const currentObjectId = (current: string | undefined): string | undefined => {
  if (current === undefined) {
    return undefined;
  }
  const eid = EID.tryParse(current);
  return eid ? EID.getEntityId(eid) : current;
};

//
// Copyright 2026 DXOS.org
//

import * as Project from '@dxos/compute/Project';
import { Obj } from '@dxos/echo';

/** The object's project, walked up the ECHO parents (task → task set → project). */
export const findProject = (object: Obj.Any): Project.Project | undefined => {
  let cursor: Obj.Any | undefined = Obj.getParent(object);
  // Bounded: a malformed parent chain must not spin, and nothing legitimate is this deep.
  for (let depth = 0; cursor && depth < 8; depth++) {
    if (Obj.instanceOf(Project.Project, cursor)) {
      return cursor;
    }
    cursor = Obj.getParent(cursor);
  }
  return undefined;
};

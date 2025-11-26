//
// Copyright 2025 DXOS.org
//

import { type Space } from '@dxos/client/echo';
import { Filter, Obj } from '@dxos/echo';
import { Function, getUserFunctionIdInMetadata } from '@dxos/functions';

export const findFunctionByDeploymentId = async (space: Space, functionId?: string) => {
  if (!functionId) {
    return undefined;
  }
  const functions = await space.db.query(Filter.type(Function.Function)).run();
  return functions.objects.find((fn) => getUserFunctionIdInMetadata(Obj.getMeta(fn)) === functionId);
};

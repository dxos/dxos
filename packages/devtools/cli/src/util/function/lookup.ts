//
// Copyright 2025 DXOS.org
//

import { Filter, type Space, getMeta } from '@dxos/client/echo';
import { Function, getUserFunctionIdInMetadata } from '@dxos/functions-runtime';

export const findFunctionByDeploymentId = async (space: Space, functionId?: string) => {
  if (!functionId) {
    return undefined;
  }
  const functions = await space.db.query(Filter.type(Function.Function)).run();
  return functions.objects.find((fn) => getUserFunctionIdInMetadata(getMeta(fn)) === functionId);
};

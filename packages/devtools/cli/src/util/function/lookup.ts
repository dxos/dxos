//
// Copyright 2025 DXOS.org
//

import { Filter, type Space, getMeta } from '@dxos/client/echo';
import { FunctionType, getUserFunctionIdInMetadata } from '@dxos/functions';

export const findFunctionByDeploymentId = async (space: Space, functionId?: string) => {
  if (!functionId) {
    return undefined;
  }
  const functions = await space.db.query(Filter.type(FunctionType)).run();
  return functions.objects.find((fn) => getUserFunctionIdInMetadata(getMeta(fn)) === functionId);
};

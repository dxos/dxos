//
// Copyright 2025 DXOS.org
//

import { Filter, getMeta, type Space } from '@dxos/client/echo';
import { FunctionType, getUserFunctionUrlInMetadata, makeFunctionUrl } from '@dxos/functions';

export const findFunctionByDeploymentId = async (space: Space, functionId?: string) => {
  if (!functionId) {
    return undefined;
  }
  const invocationUrl = makeFunctionUrl({ functionId });
  const functions = await space.db.query(Filter.schema(FunctionType)).run();
  return functions.objects.find((fn) => getUserFunctionUrlInMetadata(getMeta(fn)) === invocationUrl);
};

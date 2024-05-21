//
// Copyright 2023 DXOS.org
//

import { type FunctionHandler } from '../../handler';

export const handler: FunctionHandler<any> = async ({ response }) => {
  return response.status(200);
};

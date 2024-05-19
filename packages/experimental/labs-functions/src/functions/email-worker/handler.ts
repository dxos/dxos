//
// Copyright 2023 DXOS.org
//

import { type FunctionHandler } from '@dxos/functions';

export const handler: FunctionHandler<any> = async ({ response }) => {
  console.log(response);
  return response.status(200);
};

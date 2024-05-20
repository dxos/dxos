//
// Copyright 2023 DXOS.org
//

import { type FunctionHandler } from '@dxos/functions';
import { log } from '@dxos/log';

export const handler: FunctionHandler<any> = async ({ response }) => {
  log.info('hello world!');
  return response.status(200);
};

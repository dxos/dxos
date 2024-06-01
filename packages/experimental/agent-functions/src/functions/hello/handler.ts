//
// Copyright 2023 DXOS.org
//

import { type FunctionEventMeta, type FunctionHandler } from '@dxos/functions';
import { log } from '@dxos/log';

export const handler: FunctionHandler<FunctionEventMeta<{ sender: string }>> = async ({ event, response }) => {
  const {
    meta: { sender },
  } = event.data;
  log.info(`Hello ${sender}!`);
  return response.status(200);
};

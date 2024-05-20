//
// Copyright 2023 DXOS.org
//

import { type FunctionHandler } from '@dxos/functions';
import { log } from '@dxos/log';

// TODO(burdon): Import type from lib.
export const handler: FunctionHandler<any> = async ({ event, response }) => {
  const { messages } = event.data;
  log.info('messages', { messages: messages.length });
  return response.status(200);
};

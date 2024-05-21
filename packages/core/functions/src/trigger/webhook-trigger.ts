//
// Copyright 2024 DXOS.org
//

import { getPort } from 'get-port-please';
import http from 'node:http';

import { type Context } from '@dxos/context';
import { log } from '@dxos/log';

import { type FunctionTriggerContext, type OnTriggerCallback, type TriggerFactory } from './trigger-registry';
import type { WebhookTrigger } from '../types';

export const createWebhookTrigger: TriggerFactory<WebhookTrigger> = async (
  ctx: Context,
  _: FunctionTriggerContext,
  spec: WebhookTrigger,
  callback: OnTriggerCallback,
) => {
  // TODO(burdon): Enable POST hook with payload.
  const server = http.createServer(async (req, res) => {
    if (req.method !== spec.method) {
      res.statusCode = 405;
      return res.end();
    }
    res.statusCode = await callback({});
    res.end();
  });

  // TODO(burdon): Not used.
  // const DEF_PORT_RANGE = { min: 7500, max: 7599 };
  // const portRange = Object.assign({}, trigger.port, DEF_PORT_RANGE) as WebhookTrigger['port'];
  const port = await getPort({
    random: true,
    // portRange: [portRange!.min, portRange!.max],
  });

  // TODO(burdon): Update trigger object with actual port.
  server.listen(port, () => {
    log.info('started webhook', { port });
    spec.port = port;
  });

  ctx.onDispose(() => {
    server.close();
  });
};

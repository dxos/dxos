//
// Copyright 2024 DXOS.org
//

import { getPort } from 'get-port-please';
import http from 'node:http';

import { type Space } from '@dxos/client/echo';
import { type Context } from '@dxos/context';
import { log } from '@dxos/log';

import type { WebhookTrigger } from '../../types';
import { type TriggerCallback, type TriggerFactory } from '../trigger-registry';

export const createWebhookTrigger: TriggerFactory<WebhookTrigger> = async (
  ctx: Context,
  space: Space,
  spec: WebhookTrigger,
  callback: TriggerCallback,
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

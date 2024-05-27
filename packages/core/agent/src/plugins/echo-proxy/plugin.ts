//
// Copyright 2023 DXOS.org
//

import express from 'express';

import { PublicKey } from '@dxos/client';
import { create } from '@dxos/client/echo';
import { log } from '@dxos/log';
import { type Config } from '@dxos/protocols/proto/dxos/agent/echoproxy';

import { Plugin } from '../plugin';

const DEFAULT_OPTIONS: Required<Config> & { '@type': string } = {
  '@type': 'dxos.agent.echoproxy.Config',
  port: 7001, // TODO(burdon): Move all ports to constants (collisions).
};

// TODO(burdon): Generalize dxRPC protobuf services API (e.g., /service/rpc-method).
export class EchoProxyPlugin extends Plugin {
  public readonly id = 'dxos.org/agent/plugin/echo-proxy';

  override async onOpen() {
    this.config.config = { ...DEFAULT_OPTIONS, ...this.config.config };
    log('starting proxy...', { ports: this.config.config.port });
    await this.context.client.initialize();

    const app = express();
    app.use(express.json());

    app.get('/spaces', async (req, res) => {
      log('/spaces');
      const spaces = this.context.client.spaces.get();
      const result = {
        spaces: spaces.map((space) => ({ key: space.key.toHex() })),
      };

      res.json(result);
    });

    app.get('/space/objects/:spaceKey', async (req, res) => {
      const { spaceKey } = req.params;
      log('/space', { spaceKey });
      const result = {
        spaceKey,
      };

      if (spaceKey) {
        const space = this.context.client.spaces.get(PublicKey.from(spaceKey));
        if (space) {
          const { objects } = await space.db.query().run();
          Object.assign(result, {
            objects,
          });
        }
      }

      res.json(result);
    });

    // TODO(burdon): Upsert.
    app.post('/space/objects/:spaceKey', async (req, res) => {
      const { spaceKey } = req.params;
      log('/space', { spaceKey });
      const result = {
        spaceKey,
      };

      if (spaceKey) {
        const space = this.context.client.spaces.get(PublicKey.from(spaceKey));
        if (space) {
          const objects = req.body;
          Object.assign(result, {
            objects: objects.map(async (data: any) => {
              const object = space.db.add(create(data));
              return object.id;
            }),
          });

          await space.db.flush();
        }
      }

      res.json(result);
    });

    const { port } = this.config.config!;
    const server = app.listen(port, () => {
      log.info('proxy listening', { port });
    });

    this._ctx.onDispose(() => {
      server?.close();
    });
  }
}

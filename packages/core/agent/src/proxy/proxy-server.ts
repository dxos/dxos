//
// Copyright 2023 DXOS.org
//

import express from 'express';
import http from 'http';

import { Client, Expando, PublicKey } from '@dxos/client';
import { log } from '@dxos/log';

// TODO(burdon): Express ECHO http server (with Client to daemon/agent).
// TODO(burdon): Factor out daemon from CLI.
// TODO(burdon): GET Query/POST upsert.

export type ProxyServerOptions = {
  port: number;
};

// TODO(burdon): Generalize dxRPC protobuf services API (e.g., /service/rpc-method).
export class ProxyServer {
  private _server?: http.Server;

  // prettier-ignore
  constructor(
    private readonly _client: Client,
    private readonly _options: ProxyServerOptions
  ) {}

  async open() {
    console.log('starting...');

    // TODO(burdon): Should error if not called?
    await this._client.initialize();
    console.log(this._client.halo.identity.get());

    const app = express();
    app.use(express.json());

    // TODO(burdon): Test with https://github.com/micha/resty
    // curl -i -w '\n' -X POST -H "Content-Type: application/json" -d "{}" localhost:3000/spaces
    app.get('/spaces', async (req, res) => {
      log('/spaces');
      const spaces = this._client.spaces.get();
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
        const space = this._client.getSpace(PublicKey.from(spaceKey));
        if (space) {
          const { objects } = space.db.query();
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
        const space = this._client.getSpace(PublicKey.from(spaceKey));
        if (space) {
          const objects = req.body;
          Object.assign(result, {
            objects: objects.map(async (data: any) => {
              const object = space.db.add(new Expando(data));
              return object.id;
            }),
          });

          await space.db.flush();
        }
      }

      res.json(result);
    });

    const { port } = this._options;
    this._server = app.listen(port, () => {
      console.log('listening', { port });
    });
  }

  async close() {
    this._server?.close();
    this._server = undefined;
  }
}

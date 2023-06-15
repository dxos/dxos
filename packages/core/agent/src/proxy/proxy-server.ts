//
// Copyright 2023 DXOS.org
//

import express from 'express';
import http from 'http';

import { Client } from '@dxos/client';

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
    const app = express();
    app.use(express.json());

    // TODO(burdon): Test with https://github.com/micha/resty
    // curl -i -w '\n' -X POST -H "Content-Type: application/json" -d "{}" localhost:3000/spaces
    app.get('/spaces', async (req, res) => {
      const query = req.body;
      console.log('spaces', { query: JSON.stringify(query) });
      const spaces = this._client.spaces.get();
      const result = spaces.map((space) => ({ key: space.key.toHex() }));
      res.json(result);
    });

    app.post('/space/:key', async (req, res) => {});

    // TODO(burdon): Query objects from space.
    // TODO(burdon): Post objects to space.

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

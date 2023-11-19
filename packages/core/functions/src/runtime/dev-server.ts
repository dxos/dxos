//
// Copyright 2023 DXOS.org
//

import express from 'express';
import { getPort } from 'get-port-please';
import type http from 'http';
import { join } from 'node:path';

import { Trigger } from '@dxos/async';
import { type Client } from '@dxos/client';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type FunctionContext, type FunctionHandler, type Response } from '../handler';
import { type FunctionDef, type FunctionManifest } from '../manifest';

// TODO(burdon): Create common agent/plugin abstraction for port management.
const DEFAULT_PORT = 7001;

export type DevServerOptions = {
  port?: number;
  directory: string;
  manifest: FunctionManifest;
};

/**
 * Functions dev server provides a local HTTP server for testing functions.
 */
// TODO(burdon): Reconcile with agent/functions dev dispatcher.
export class DevServer {
  private readonly _handlers: Record<string, { def: FunctionDef; handler: FunctionHandler<any> }> = {};

  private _server?: http.Server;
  private _port?: number;
  private _registrationId?: string;

  // prettier-ignore
  constructor(
    private readonly _client: Client,
    private readonly _options: DevServerOptions,
  ) {}

  get port() {
    return this._port;
  }

  get endpoint() {
    invariant(this._port);
    return `http://localhost:${this._port}`;
  }

  get functions() {
    return Object.values(this._handlers);
  }

  async initialize() {
    for (const def of this._options.manifest.functions) {
      const { id, path, handler: dir } = def;
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const module = require(join(this._options.directory, dir));
        const handler = module.default;
        if (typeof handler !== 'function') {
          throw new Error(`Handler must export default function: ${id}`);
        }

        if (this._handlers[path]) {
          log.warn(`Function already registered: ${id}`);
        }

        this._handlers[path] = { def, handler };
      } catch (err) {
        log.error('parsing function (check manifest)', err);
      }
    }
  }

  async start() {
    const app = express();
    app.use(express.json());

    app.post('/:name', async (req, res) => {
      const { name } = req.params;

      const response: Response = {
        status: (code: number) => {
          res.statusCode = code;
          return response;
        },

        succeed: (result = {}) => {
          res.end(JSON.stringify(result));
          return response;
        },
      };

      const context: FunctionContext = {
        client: this._client,
        status: response.status.bind(response),
      };

      void (async () => {
        try {
          log(`invoking: ${name}`);
          const { handler } = this._handlers[name];
          const response = await handler({ context, event: req.body });
          log('done', { response });
        } catch (err: any) {
          res.statusCode = 500;
          res.end(err.message);
        }
      })();
    });

    // TODO(burdon): Require option to allow auto-detect free port.
    const port = this._options.port ?? DEFAULT_PORT;
    this._port = await getPort({ port, portRange: [port, port + 100] });
    this._server = app.listen(this._port);

    // TODO(burdon): Test during initialization.
    try {
      const { registrationId } = await this._client.services.services.FunctionRegistryService!.register({
        endpoint: this.endpoint,
        functions: this.functions.map(({ def: { path } }) => ({ name: path })),
      });

      this._registrationId = registrationId;
    } catch (err: any) {
      await this.stop();
      throw new Error('FunctionRegistryService not available; check config (agent.plugins.functions).');
    }
  }

  async stop() {
    const trigger = new Trigger();
    this._server?.close(async () => {
      if (this._registrationId) {
        await this._client.services.services.FunctionRegistryService!.unregister({
          registrationId: this._registrationId,
        });
        this._registrationId = undefined;
      }

      trigger.wake();
    });

    await trigger.wait();
    this._port = undefined;
    this._server = undefined;
  }
}

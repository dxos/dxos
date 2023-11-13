//
// Copyright 2023 DXOS.org
//

import express from 'express';
import type http from 'http';
import { join } from 'node:path';
import { getPortPromise } from 'portfinder';

import { Trigger } from '@dxos/async';
import { type Client } from '@dxos/client';
import { log } from '@dxos/log';

import { type FunctionContext, type FunctionHandler, type Response } from '../handler';
import { type FunctionDef, type FunctionManifest } from '../manifest';

const DEFAULT_PORT = 7001;

export type DevServerOptions = {
  directory: string;
  manifest: FunctionManifest;
};

/**
 * Functions dev server provides a local HTTP server for testing functions.
 */
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
    return this._port ? `http://localhost:${this._port}` : undefined;
  }

  get functions() {
    return Object.values(this._handlers);
  }

  async initialize() {
    for (const def of this._options.manifest.functions) {
      const { id, endpoint, handler: path } = def;
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const module = require(join(this._options.directory, path));
        const handler = module.default;
        if (typeof handler !== 'function') {
          throw new Error(`Handler must export default function: ${id}`);
        }

        if (this._handlers[endpoint]) {
          log.warn(`Function already registered: ${id}`);
        }

        this._handlers[endpoint] = { def, handler };
      } catch (err) {
        log.error('parsing function (check manifest)', err);
      }
    }
  }

  async start() {
    const app = express();
    app.use(express.json());

    app.post('/:endpoint', async (req, res) => {
      const { endpoint } = req.params;

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
          log('invoking', { endpoint });
          const { handler } = this._handlers[endpoint];
          const response = await handler({ context, event: req.body });
          log('done', { response });
        } catch (err: any) {
          res.statusCode = 500;
          res.end(err.message);
        }
      })();
    });

    this._port = await getPortPromise({ startPort: DEFAULT_PORT });
    this._server = app.listen(this._port);

    // TODO(burdon): Check plugin is registered.
    //  TypeError: Cannot read properties of undefined (reading 'register')
    try {
      const { registrationId } = await this._client.services.services.FunctionRegistryService!.register({
        endpoint: this.endpoint!,
        functions: this.functions.map(({ def: { endpoint } }) => ({ name: endpoint })), // TODO(burdon): Change proto name => id.
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
    this._server = undefined;
    this._port = undefined;
  }
}

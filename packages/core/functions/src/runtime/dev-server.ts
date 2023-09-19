//
// Copyright 2023 DXOS.org
//

import express from 'express';
import http from 'http';
import { join } from 'node:path';
import { getPortPromise } from 'portfinder';

import { Trigger } from '@dxos/async';
import { Client } from '@dxos/client';
import { log } from '@dxos/log';

import { FunctionContext, FunctionHandler, FunctionsManifest, Response } from '../function';

const DEFAULT_PORT = 7000;

export type DevServerOptions = {
  directory: string;
  manifest: FunctionsManifest;
};

/**
 * Functions dev server provides a local HTTP server for testing functions.
 */
export class DevServer {
  private readonly _functionHandlers: Record<string, FunctionHandler> = {};

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
    return Object.keys(this._functionHandlers);
  }

  async initialize() {
    for (const [name, _] of Object.entries(this._options.manifest.functions)) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const module = require(join(this._options.directory, name));
        const handler = module.default;
        if (typeof handler !== 'function') {
          throw new Error(`Handler must export default function: ${name}`);
        }

        this._functionHandlers[name] = handler;
      } catch (err) {
        log.error('parsing function (check functions.yml manifest)', err);
      }
    }
  }

  async start() {
    const app = express();
    app.use(express.json());

    app.post('/:functionName', async (req, res) => {
      const functionName = req.params.functionName;
      log('invoke', { function: functionName, data: req.body });

      const builder: Response = {
        status: (code: number) => {
          res.statusCode = code;
          return builder;
        },
        succeed: (result = {}) => {
          res.end(JSON.stringify(result));
          return builder;
        },
      };

      const context: FunctionContext = {
        client: this._client,
        status: builder.status.bind(builder),
      };

      void (async () => {
        try {
          await this._functionHandlers[functionName](req.body, context);
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
        functions: this.functions.map((name) => ({ name })),
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

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

export type DevServerOptions = {
  port?: number;
  directory: string;
  manifest: FunctionManifest;
  reload?: boolean;
};

/**
 * Functions dev server provides a local HTTP server for testing functions.
 */
// TODO(burdon): Reconcile with agent/functions dev dispatcher.
export class DevServer {
  // Function handlers indexed by name (URL path).
  private readonly _handlers: Record<string, { def: FunctionDef; handler: FunctionHandler<any> }> = {};

  private _server?: http.Server;
  private _port?: number;
  private _registrationId?: string;
  private _proxy?: string;
  private _request = 0;

  // prettier-ignore
  constructor(
    private readonly _client: Client,
    private readonly _options: DevServerOptions,
  ) {}

  get endpoint() {
    invariant(this._port);
    return `http://localhost:${this._port}`;
  }

  get proxy() {
    return this._proxy;
  }

  get functions() {
    return Object.values(this._handlers);
  }

  async initialize() {
    for (const def of this._options.manifest.functions) {
      try {
        await this._load(def);
      } catch (err) {
        log.error('parsing function (check manifest)', err);
      }
    }
  }

  private async _load(def: FunctionDef) {
    const { id, name, handler } = def;
    log.info('loading', { id });

    // Remove from cache.
    const path = join(this._options.directory, handler);
    Object.keys(require.cache)
      .filter((key) => key.startsWith(path))
      .forEach((key) => delete require.cache[key]);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const module = require(path);
    if (typeof module.default !== 'function') {
      throw new Error(`Handler must export default function: ${id}`);
    }

    this._handlers[name] = { def, handler: module.default };
  }

  // TODO(burdon): Option to reload.
  private async invoke(name: string, event: any) {
    const id = ++this._request;
    const now = Date.now();

    log.info('req', { id, name });
    const { handler } = this._handlers[name];

    const context: FunctionContext = {
      client: this._client,
    };

    let statusCode = 200;
    const response: Response = {
      status: (code: number) => {
        statusCode = code;
        return response;
      },
    };

    await handler({ context, event, response });
    log.info('res', { id, name, statusCode, duration: Date.now() - now });

    return statusCode;
  }

  async start() {
    const app = express();
    app.use(express.json());

    app.post('/:name', async (req, res) => {
      const { name } = req.params;
      try {
        if (this._options.reload) {
          const { def } = this._handlers[name];
          await this._load(def);
        }

        res.statusCode = await this.invoke(name, req.body);
        res.end();
      } catch (err: any) {
        log.error(err);
        res.statusCode = 500;
        res.end();
      }
    });

    // TODO(burdon): Push down port management to agent.
    this._port = await getPort({ port: 7200, portRange: [7200, 7299] });
    this._server = app.listen(this._port);

    // TODO(burdon): Test during initialization.
    try {
      // Register functions.
      const { registrationId, endpoint } = await this._client.services.services.FunctionRegistryService!.register({
        endpoint: this.endpoint,
        functions: this.functions.map(({ def: { name } }) => ({ name })),
      });

      log.info('registered', { registrationId, endpoint });
      this._registrationId = registrationId;
      this._proxy = endpoint;
    } catch (err: any) {
      await this.stop();
      throw new Error('FunctionRegistryService not available (check plugin is configured).');
    }
  }

  async stop() {
    const trigger = new Trigger();
    this._server?.close(async () => {
      if (this._registrationId) {
        await this._client.services.services.FunctionRegistryService!.unregister({
          registrationId: this._registrationId,
        });

        log.info('unregistered', { registrationId: this._registrationId });
        this._registrationId = undefined;
        this._proxy = undefined;
      }

      trigger.wake();
    });

    await trigger.wait();
    this._port = undefined;
    this._server = undefined;
  }
}

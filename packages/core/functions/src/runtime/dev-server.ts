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
import { type FunctionDef, type FunctionManifest } from '../types';

export type DevServerOptions = {
  manifest: FunctionManifest;
  baseDir: string;
  port?: number;
  reload?: boolean;
  dataDir?: string;
};

/**
 * Functions dev server provides a local HTTP server for testing functions.
 */
export class DevServer {
  // Function handlers indexed by name (URL path).
  private readonly _handlers: Record<string, { def: FunctionDef; handler: FunctionHandler<any> }> = {};

  private _server?: http.Server;
  private _port?: number;
  private _registrationId?: string;
  private _proxy?: string;
  private _seq = 0;

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

  async start() {
    const app = express();
    app.use(express.json());

    app.post('/:name', async (req, res) => {
      const { name } = req.params;
      try {
        log.info('calling', { name });
        if (this._options.reload) {
          const { def } = this._handlers[name];
          await this._load(def, true);
        }

        // TODO(burdon): Get function context.
        res.statusCode = await this._invoke(name, req.body);
        res.end();
      } catch (err: any) {
        log.catch(err);
        res.statusCode = 500;
        res.end();
      }
    });

    this._port = await getPort({ host: 'localhost', port: 7200, portRange: [7200, 7299] });
    this._server = app.listen(this._port);

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
        invariant(this._client.services.services.FunctionRegistryService);
        await this._client.services.services.FunctionRegistryService.unregister({
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

  /**
   * Load function.
   */
  private async _load(def: FunctionDef, flush = false) {
    const { id, name, handler } = def;
    const path = join(this._options.baseDir, handler);
    log.info('loading', { id });

    // Remove from cache.
    if (flush) {
      Object.keys(require.cache)
        .filter((key) => key.startsWith(path))
        .forEach((key) => delete require.cache[key]);
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const module = require(path);
    if (typeof module.default !== 'function') {
      throw new Error(`Handler must export default function: ${id}`);
    }

    this._handlers[name] = { def, handler: module.default };
  }

  /**
   * Invoke function handler.
   */
  private async _invoke(name: string, event: any) {
    const seq = ++this._seq;
    const now = Date.now();

    log.info('req', { seq, name });
    const { handler } = this._handlers[name];

    const context: FunctionContext = {
      client: this._client,
      dataDir: this._options.dataDir,
    };

    let statusCode = 200;
    const response: Response = {
      status: (code: number) => {
        statusCode = code;
        return response;
      },
    };

    await handler({ context, event, response });
    log.info('res', { seq, name, statusCode, duration: Date.now() - now });

    return statusCode;
  }
}

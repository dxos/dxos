//
// Copyright 2023 DXOS.org
//

import express from 'express';
import { getPort } from 'get-port-please';
import type http from 'http';
import { join } from 'node:path';

import { Event, Trigger } from '@dxos/async';
import { type Client } from '@dxos/client';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type FunctionContext, type FunctionEvent, type FunctionHandler, type Response } from '../handler';
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
  private _functionServiceRegistration?: string;
  private _proxy?: string;
  private _seq = 0;

  public readonly update = new Event<number>();

  // prettier-ignore
  constructor(
    private readonly _client: Client,
    private readonly _options: DevServerOptions,
  ) {}

  get stats() {
    return {
      seq: this._seq,
    };
  }

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
    invariant(!this._server);
    log.info('starting...');

    // TODO(burdon): Move to hono.
    const app = express();
    app.use(express.json());

    app.post('/:path', async (req, res) => {
      const { path } = req.params;
      try {
        log.info('calling', { path });
        if (this._options.reload) {
          const { def } = this._handlers['/' + path];
          await this._load(def, true);
        }

        // TODO(burdon): Get function context.
        res.statusCode = await this.invoke('/' + path, req.body);
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
        functions: this.functions.map(({ def: { id, path } }) => ({ id, path })),
      });

      log.info('registered', { endpoint });
      this._proxy = endpoint;
      this._functionServiceRegistration = registrationId;
    } catch (err: any) {
      await this.stop();
      throw new Error('FunctionRegistryService not available (check plugin is configured).');
    }

    log.info('started', { port: this._port });
  }

  async stop() {
    invariant(this._server);
    log.info('stopping...');

    const trigger = new Trigger();
    this._server.close(async () => {
      log.info('server stopped');
      try {
        if (this._functionServiceRegistration) {
          invariant(this._client.services.services.FunctionRegistryService);
          await this._client.services.services.FunctionRegistryService.unregister({
            registrationId: this._functionServiceRegistration,
          });

          log.info('unregistered', { registrationId: this._functionServiceRegistration });
          this._functionServiceRegistration = undefined;
          this._proxy = undefined;
        }

        trigger.wake();
      } catch (err) {
        trigger.throw(err as Error);
      }
    });

    await trigger.wait();
    this._port = undefined;
    this._server = undefined;
    log.info('stopped');
  }

  /**
   * Load function.
   */
  private async _load(def: FunctionDef, force = false) {
    const { id, path, handler } = def;
    const filePath = join(this._options.baseDir, handler);
    log.info('loading', { id, force });

    // Remove from cache.
    if (force) {
      Object.keys(require.cache)
        .filter((key) => key.startsWith(filePath))
        .forEach((key) => {
          delete require.cache[key];
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const module = require(filePath);
    if (typeof module.default !== 'function') {
      throw new Error(`Handler must export default function: ${id}`);
    }

    this._handlers[path] = { def, handler: module.default };
  }

  /**
   * Invoke function.
   */
  public async invoke(path: string, data: any): Promise<number> {
    const seq = ++this._seq;
    const now = Date.now();

    log.info('req', { seq, path });
    const statusCode = await this._invoke(path, { data });

    log.info('res', { seq, path, statusCode, duration: Date.now() - now });
    this.update.emit(statusCode);
    return statusCode;
  }

  private async _invoke(path: string, event: FunctionEvent) {
    const { handler } = this._handlers[path] ?? {};
    invariant(handler, `invalid path: ${path}`);

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
    return statusCode;
  }
}

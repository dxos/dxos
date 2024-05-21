//
// Copyright 2023 DXOS.org
//

import express from 'express';

import { log } from '@dxos/log';
import { type FunctionsConfig } from '@dxos/protocols/proto/dxos/agent/functions';

import { DevFunctionDispatcher } from './dev';
import { type FunctionDispatcher } from './types';
import { Plugin } from '../plugin';

const DEFAULT_CONFIG: Partial<FunctionsConfig> = {
  port: 7100, // TODO(burdon): Extract const.
};

/**
 * Functions plugin:
 * - Gateway for inbound HTTP function triggers.
 * - Configures triggers and other function event generators.
 * - ClientServices endpoint for peers.
 * - TODO(burdon): Basic token based security.
 */
export class FunctionsPlugin extends Plugin {
  public readonly id = 'dxos.org/agent/plugin/functions';

  // Map of dispatchers by runtime name.
  private readonly _dispatchers: Map<string, FunctionDispatcher> = new Map();

  override async onOpen() {
    /**
     * Function front-end proxy server; dispatches to backend (e.g., dev-server).
     */
    // TODO(burdon): Move to hono.
    const app = express();
    app.use(express.json());

    app.post('/:runtime/:path', async (req, res) => {
      const { runtime, path } = req.params;
      const dispatcher = this._dispatchers.get(runtime);
      if (!runtime || !path || !dispatcher) {
        res.statusCode = 404;
        res.end();
        return;
      }

      try {
        const result = await dispatcher.invoke({ path, event: req.body, runtime });
        res.statusCode = result.status;
        res.end(result.response);
      } catch (err: any) {
        log.error(err);
        res.statusCode = 500;
        res.end();
      }
    });

    this.config.config = { ...DEFAULT_CONFIG, ...this.config.config };
    const port = this.config.config!.port;
    const server = app.listen(port, () => {
      log.info('Functions plugin', { port });
    });

    /**
     * If configured the CLI can connect to the DevFunctionDispatcher to register function endpoints
     * that are running in the functions DevServer started by the CLI.
     */
    // TODO(burdon): Configure.
    const runtime = 'dev';
    const dispatcher = new DevFunctionDispatcher({ endpoint: `http://localhost:${port}/${runtime}` });
    if (dispatcher) {
      this.host.serviceRegistry.addService('FunctionRegistryService', dispatcher);
      this._dispatchers.set(runtime, dispatcher);
    }

    this._ctx.onDispose(() => {
      if (dispatcher) {
        this.host.serviceRegistry.removeService('FunctionRegistryService');
      }

      server?.close();
    });
  }
}

//
// Copyright 2023 DXOS.org
//

import express from 'express';
import { type Server } from 'node:http';

import { log } from '@dxos/log';
import { type FunctionsConfig } from '@dxos/protocols/proto/dxos/agent/functions';

import { DevFunctionDispatcher } from './dev-dispatcher';
import { type FunctionDispatcher } from './dispatcher';
import { Plugin } from '../plugin';

const DEFAULT_OPTIONS: Required<FunctionsConfig> & { '@type': string } = {
  '@type': 'dxos.agent.functions.FunctionsConfig',
  port: 7001, // TODO(burdon): Change default (clashes with OS/X).
};

export class FunctionsPlugin extends Plugin {
  public readonly id = 'dxos.org/agent/plugin/functions';
  private readonly _dispatchers: Map<string, FunctionDispatcher> = new Map();
  private readonly _devDispatcher = new DevFunctionDispatcher();

  private _server?: Server;

  async open() {
    if (!this._config.enabled) {
      log.info('Functions disabled.');
      return;
    }

    this._config.config = { ...DEFAULT_OPTIONS, ...this._config.config };

    this._dispatchers.set('dev', this._devDispatcher);
    this.host.serviceRegistry.addService('FunctionRegistryService', this._devDispatcher);

    const app = express();
    app.use(express.json());

    app.post('/:dispatcher/:functionName', (req, res) => {
      const { dispatcher, functionName } = req.params;
      if (!dispatcher || !functionName || !this._dispatchers.has(dispatcher)) {
        res.statusCode = 404;
        res.end();
        return;
      }

      this._dispatchers
        .get(dispatcher)!
        .invoke({
          function: functionName,
          event: req.body,
          runtime: dispatcher,
        })
        .then(
          (result) => {
            res.statusCode = result.status;
            res.end(result.response);
          },
          (error) => {
            res.statusCode = 500;
            res.end(error.message);
          },
        );
    });

    const port = this._config.config!.port;
    this._server = app.listen(port, () => {
      console.log('functions server listening', { port });
    });
    this.statusUpdate.emit();
  }

  async close() {
    this.host.serviceRegistry.removeService('FunctionRegistryService');
    this._server?.close();
    this.statusUpdate.emit();
  }
}

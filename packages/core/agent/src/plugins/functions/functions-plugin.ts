//
// Copyright 2023 DXOS.org
//

import express from 'express';

import { DevFunctionDispatcher } from './dev-dispatcher';
import { type FunctionDispatcher } from './dispatcher';
import { AbstractPlugin } from '../plugin';
import { Server } from 'http';

const DEFAULT_PORT = 7000;

export type FunctionsPluginOptions = {
  port?: number;
};

export class FunctionsPlugin extends AbstractPlugin {
  private readonly _dispatchers: Map<string, FunctionDispatcher> = new Map();
  private readonly _devDispatcher = new DevFunctionDispatcher();

  private _server?: ReturnType<typeof express>;
  private _httpListener?: Server;

  constructor(private readonly _options: FunctionsPluginOptions) {
    super();
  }

  async open() {
    this._dispatchers.set('dev', this._devDispatcher);
    this.host.serviceRegistry.addService('FunctionRegistryService', this._devDispatcher);

    this._server = express();
    this._server.use(express.json());

    this._server.post('/:dispatcher/:functionName', (req, res) => {
      const dispatcher = req.params.dispatcher;
      const functionName = req.params.functionName;

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

    const port = this._options.port ?? DEFAULT_PORT;
    this._httpListener = this._server.listen(port, () => {
      console.log('functions server listening', { port });
    });
  }

  async close() {
    this._httpListener?.close();
    this.host.serviceRegistry.removeService('FunctionRegistryService');
  }
}

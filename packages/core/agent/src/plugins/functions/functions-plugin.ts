//
// Copyright 2023 DXOS.org
//

import express from 'express';

import { log } from '@dxos/log';
import { type Runtime } from '@dxos/protocols/proto/dxos/config';

import { DevFunctionDispatcher } from './dev-dispatcher';
import { type FunctionDispatcher } from './dispatcher';
import { AbstractPlugin } from '../plugin';

type Options = Required<Runtime.Agent.Plugins.Functions>;

export type FunctionsPluginOptions = {
  port?: number;
};

const DEFAULT_OPTIONS: Options = {
  enabled: false,
  port: 7000,
};

export class FunctionsPlugin extends AbstractPlugin {
  public readonly id = 'functions';
  private readonly _dispatchers: Map<string, FunctionDispatcher> = new Map();
  private readonly _devDispatcher = new DevFunctionDispatcher();
  private _options?: Options;

  private _server?: ReturnType<typeof express>;

  constructor(private readonly _params: FunctionsPluginOptions) {
    super();
  }

  async open() {
    this._options = { ...DEFAULT_OPTIONS, ...this._params, ...this._pluginConfig };

    if (!this._options.enabled) {
      log.info('Functions disabled.');
      return;
    }

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

    const port = this._options.port;
    this._server.listen(port, () => {
      console.log('functions server listening', { port });
    });
  }

  async close() {
    this.host.serviceRegistry.removeService('FunctionRegistryService');
  }
}

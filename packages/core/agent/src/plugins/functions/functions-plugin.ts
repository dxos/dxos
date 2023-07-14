//
// Copyright 2023 DXOS.org
//

import express from 'express';

import { Client, ClientServicesProvider, Config, LocalClientServices } from '@dxos/client';
import { ClientServicesHost } from '@dxos/client-services';
import { log } from '@dxos/log';

import { DevFunctionDispatcher } from './dev-dispatcher';
import { FunctionDispatcher } from './dispatcher';
import { Plugin } from '../plugin';
import { failUndefined } from '@dxos/debug';

export class FunctionsPlugin implements Plugin {
  private _dispatchers: Map<string, FunctionDispatcher> = new Map();

  private _services!: ClientServicesHost;

  private _devDispatcher = new DevFunctionDispatcher();

  private _server?: ReturnType<typeof express>;

  constructor(private readonly _config: Config) {}

  async initialize(client: Client, clientServices: ClientServicesProvider): Promise<void> {
    this._services = (clientServices as LocalClientServices).host ?? failUndefined();
  }

  async open() {
    if(!this._config.values.runtime?.agent?.functions) {
      return;
    }

    this._dispatchers.set('dev', this._devDispatcher);
    this._services.serviceRegistry.addService('FunctionRegistryService', this._devDispatcher);

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

    const port = this._config.values.runtime?.agent?.functions?.port ?? 7000;
    this._server.listen(port, () => {
      log.info('Functions server listening', { port: port });
    });
  }

  async close() {
    this._services.serviceRegistry.removeService('FunctionRegistryService');
  }
}

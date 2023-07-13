import { ClientServicesHost } from "@dxos/client-services";
import { FunctionDispatcher } from "./dispatcher";
import { Config } from "@dxos/client";
import { DevFunctionDispatcher } from "./dev-dispatcher";
import { createServer } from "node:http";
import { Server } from "node:http";
import { log } from "@dxos/log";
import { IncomingMessage } from "node:http";
import { ServerResponse } from "node:http";
import express from 'express';

const FUNCTIONS_PORT = 7001;

export class FunctionsPlugin {
  private _dispatchers: Map<string, FunctionDispatcher> = new Map();

  private _devDispatcher = new DevFunctionDispatcher();

  private _server?: ReturnType<typeof express>;

  constructor(
    private readonly _config: Config,
    private readonly _services: ClientServicesHost,
  ) {
  }

  async open() {
    this._dispatchers.set('dev', this._devDispatcher);
    this._services.serviceRegistry.addService('FunctionRegistryService', this._devDispatcher);

    this._server = express()
    this._server.use(express.json());

    this._server.post('/:dispatcher/:functionName', (req, res) => {
      const dispatcher = req.params.dispatcher;
      const functionName = req.params.functionName;
      
      if (!dispatcher || !functionName || !this._dispatchers.has(dispatcher)) {
        res.statusCode = 404;
        res.end();
        return;
      }
  
      this._dispatchers.get(dispatcher)!.invoke({
        function: functionName,
        event: req.body,
        runtime: dispatcher,
      }).then(
        result => {
          res.statusCode = result.status;
          res.end(result.response);
        },
        error => {
          res.statusCode = 500;
          res.end(error.message);
        }
      )
    })

    this._server.listen(FUNCTIONS_PORT, () => {
      log.info(`Functions server listening`, { port: FUNCTIONS_PORT });
    });
  }

  async close() {
    this._services.serviceRegistry.removeService('FunctionRegistryService');
  }
}
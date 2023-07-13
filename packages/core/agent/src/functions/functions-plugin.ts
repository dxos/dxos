import { ClientServicesHost } from "@dxos/client-services";
import { FunctionDispatcher } from "./dispatcher";
import { Config } from "@dxos/client";
import { DevFunctionDispatcher } from "./dev-dispatcher";
import { createServer } from "node:http";
import { Server } from "node:http";
import { log } from "@dxos/log";
import { IncomingMessage } from "node:http";
import { ServerResponse } from "node:http";

const FUNCTIONS_PORT = 7001;

export class FunctionsPlugin {
  private _dispatchers: Map<string, FunctionDispatcher> = new Map();

  private _devDispatcher = new DevFunctionDispatcher();

  private _server?: Server;

  constructor(
    private readonly _config: Config,
    private readonly _services: ClientServicesHost,
  ) {
  }

  async open() {
    this._dispatchers.set('dev', this._devDispatcher);
    this._services.serviceRegistry.addService('FunctionRegistryService', this._devDispatcher);

    this._server = createServer((req, res) => {
      this._handleFunctionRequest(req, res);
    });

    this._server.listen(FUNCTIONS_PORT, () => {
      log.info(`Functions server listening`, { port: FUNCTIONS_PORT });
    });
  }

  async close() {
    this._services.serviceRegistry.removeService('FunctionRegistryService');
    this._server?.close();
  }

  private _handleFunctionRequest(req: IncomingMessage, res: ServerResponse) {
    log.info(`Function request`, { url: req.url });
  }
}
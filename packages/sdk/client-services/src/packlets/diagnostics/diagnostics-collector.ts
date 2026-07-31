//
// Copyright 2024 DXOS.org
//

import { type ClientServicesProvider } from '@dxos/client-protocol';
import { type Config } from '@dxos/config';
import { GetDiagnosticsRequest } from '@dxos/protocols/proto/dxos/client/services';
import { type JsonKeyOptions, jsonKeyReplacer } from '@dxos/util';

import { createCollectDiagnosticsBroadcastSender } from './diagnostics-broadcast';

const GET_DIAGNOSTICS_RPC_TIMEOUT = 10_000;

export interface CollectDiagnosticsBroadcastSender {
  broadcastDiagnosticsRequest(): any;
}

export interface CollectDiagnosticsBroadcastHandler {
  start(): void;
  stop(): void;
}

export class DiagnosticsCollector {
  private static broadcastSender = createCollectDiagnosticsBroadcastSender();

  public static async collect(
    config: Config | Config[] = [],
    services: ClientServicesProvider | null = null,
    options: JsonKeyOptions = {},
  ): Promise<any> {
    const serviceDiagnostics = await services?.services?.SystemService?.getDiagnostics(
      {
        keys: options.humanize
          ? GetDiagnosticsRequest.KEY_OPTION.HUMANIZE
          : options.truncate
            ? GetDiagnosticsRequest.KEY_OPTION.TRUNCATE
            : undefined,
      },
      { timeout: GET_DIAGNOSTICS_RPC_TIMEOUT },
    );

    const clientDiagnostics = {
      config,
    };

    const diagnostics =
      serviceDiagnostics != null
        ? { client: clientDiagnostics, services: serviceDiagnostics }
        : {
            client: clientDiagnostics,
            broadcast: await this.broadcastSender.broadcastDiagnosticsRequest(),
          };

    return JSON.parse(JSON.stringify(diagnostics, jsonKeyReplacer(options)));
  }
}

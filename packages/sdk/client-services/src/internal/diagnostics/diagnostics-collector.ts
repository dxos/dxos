//
// Copyright 2024 DXOS.org
//

import { type ClientServicesProvider } from '@dxos/client-protocol';
import { type Config } from '@dxos/config';
import { SystemService } from '@dxos/protocols/rpc';
import { type JsonKeyOptions, jsonKeyReplacer } from '@dxos/util';

const GET_DIAGNOSTICS_RPC_TIMEOUT = 10_000;

export class DiagnosticsCollector {
  public static async collect(
    config: Config | Config[] = [],
    services: ClientServicesProvider | null = null,
    options: JsonKeyOptions = {},
  ): Promise<any> {
    const serviceDiagnostics = await services?.services?.SystemService?.getDiagnostics(
      {
        keys: options.humanize
          ? SystemService.KeyOption.enums.HUMANIZE
          : options.truncate
            ? SystemService.KeyOption.enums.TRUNCATE
            : undefined,
      },
      { timeout: GET_DIAGNOSTICS_RPC_TIMEOUT },
    );

    const clientDiagnostics = {
      config,
    };

    const diagnostics = { client: clientDiagnostics, services: serviceDiagnostics ?? undefined };

    return JSON.parse(JSON.stringify(diagnostics, jsonKeyReplacer(options)));
  }
}

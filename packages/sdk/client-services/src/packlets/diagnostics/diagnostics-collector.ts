//
// Copyright 2024 DXOS.org
//

import { type ClientServicesProvider } from '@dxos/client-protocol';
import { type Config, ConfigResource } from '@dxos/config';
import { GetDiagnosticsRequest } from '@dxos/protocols/proto/dxos/client/services';
import { TRACE_PROCESSOR } from '@dxos/tracing';
import { type JsonKeyOptions, jsonKeyReplacer, nonNullable } from '@dxos/util';

import { createCollectDiagnosticsBroadcastSender } from './diagnostics-broadcast';
import { ClientServicesProviderResource } from '../services';

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
    config: Config | Config[] = findConfigs(),
    services: ClientServicesProvider | null = findSystemServiceProvider(),
    options: JsonKeyOptions = {},
  ): Promise<any> {
    const serviceDiagnostics = await services?.services?.SystemService?.getDiagnostics({
      keys: options.humanize
        ? GetDiagnosticsRequest.KEY_OPTION.HUMANIZE
        : options.truncate
          ? GetDiagnosticsRequest.KEY_OPTION.TRUNCATE
          : undefined,
    });

    const clientDiagnostics = {
      config,
      trace: TRACE_PROCESSOR.getDiagnostics(),
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

const findSystemServiceProvider = (): ClientServicesProvider | null => {
  const serviceProviders = TRACE_PROCESSOR.findResourcesByAnnotation(ClientServicesProviderResource);
  const providerResource = serviceProviders.find((r) => r.instance.deref()?.services?.SystemService != null);
  return providerResource?.instance?.deref() ?? null;
};

const findConfigs = (): Config[] => {
  const configs = TRACE_PROCESSOR.findResourcesByAnnotation(ConfigResource);
  return configs.map((r) => r.instance.deref()).filter(nonNullable);
};

//
// Copyright 2024 DXOS.org
//

import { type ClientServicesProvider } from '@dxos/client-protocol';
import { type Config, type ConfigProto, ConfigResource } from '@dxos/config';
import { GetDiagnosticsRequest } from '@dxos/protocols/proto/dxos/client/services';
import { TRACE_PROCESSOR } from '@dxos/tracing';
import { type JsonKeyOptions, jsonKeyReplacer, nonNullable } from '@dxos/util';

import { ClientServicesProviderResource } from '../services';

export class DiagnosticsCollector {
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
      config: config != null ? (Array.isArray(config) ? mergeConfigs(config) : config.values) : undefined,
      trace: TRACE_PROCESSOR.getDiagnostics(),
    };

    const diagnostics = {
      client: clientDiagnostics,
      services: serviceDiagnostics,
    };

    return JSON.parse(JSON.stringify(diagnostics, jsonKeyReplacer(options)));
  }
}

const mergeConfigs = (configs: Config[]) =>
  configs.reduce<{ [idx: number]: ConfigProto }>((acc, v, idx) => {
    acc[idx] = v.values;
    return acc;
  }, {});

const findSystemServiceProvider = (): ClientServicesProvider | null => {
  const serviceProviders = TRACE_PROCESSOR.findByAnnotation(ClientServicesProviderResource);
  const providerResource = serviceProviders.find((r) => r.instance.deref()?.services?.SystemService != null);
  return providerResource?.instance?.deref() ?? null;
};

const findConfigs = (): Config[] => {
  const configs = TRACE_PROCESSOR.findByAnnotation(ConfigResource);
  return configs.map((r) => r.instance.deref()).filter(nonNullable);
};

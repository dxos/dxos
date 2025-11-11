//
// Copyright 2025 DXOS.org
//

import type * as Context from 'effect/Context';
import * as Layer from 'effect/Layer';

import { AiService } from '@dxos/ai';
import { DatabaseService } from '@dxos/echo-db';
import {
  ComputeEventLogger,
  ConfiguredCredentialsService,
  CredentialsService,
  FunctionInvocationService,
  QueueService,
  TracingService,
} from '@dxos/functions';
import { entries } from '@dxos/util';

import { RemoteFunctionExecutionService } from './remote-function-execution-service';

// TODO(dmaretskyi): Refactor this module to only rely on tags and not the human-assigned names.

/**
 * List of all services.
 */
const SERVICES = {
  ai: AiService.AiService,
  credentials: CredentialsService,
  database: DatabaseService,
  eventLogger: ComputeEventLogger,
  functionInvocationService: FunctionInvocationService,
  functionCallService: RemoteFunctionExecutionService,
  queues: QueueService,
  tracing: TracingService,
} as const satisfies Record<string, Context.TagClass<any, string, any>>;

/**
 * Mapping of service names to their tags.
 */
export type ServiceTagRecord = {
  [K in keyof typeof SERVICES]: (typeof SERVICES)[K] extends { new (_: never): infer T } ? T : never;
};

/**
 * Mapping of service names to their runtime types.
 */
export type ServiceRecord = {
  [K in keyof ServiceTagRecord]: Context.Tag.Service<ServiceTagRecord[K]>;
};

/**
 * Union of all runtime services tags.
 */
export type RuntimeServices = ServiceTagRecord[keyof ServiceTagRecord];

const SERVICE_MAPPING: Record<string, keyof ServiceRecord> = Object.fromEntries(
  entries(SERVICES).map(([name, tag]) => [tag.key, name]),
);

export const SERVICE_TAGS: Context.Tag<any, any>[] = Object.values(SERVICES);

const DEFAULT_SERVICES: Partial<ServiceRecord> = {
  tracing: TracingService.noop,
};

/**
 * Legacy service container for managing runtime services.
 * @deprecated Use Effect layers directly instead of ServiceContainer.
 */
export class ServiceContainer {
  private _services: Partial<ServiceRecord> = { ...DEFAULT_SERVICES };

  /**
   * Set services.
   * @param services - Services to set.
   * @returns The container instance.
   */
  setServices(services: Partial<ServiceRecord>): this {
    this._services = { ...this._services, ...services };
    return this;
  }

  getService<Id, T>(tag: Context.Tag<Id, T>): T {
    const serviceKey = SERVICE_MAPPING[tag.key];
    const service = serviceKey != null ? this._services[serviceKey] : undefined;
    if (!service) {
      throw new Error(`Service not available: ${tag.key}`);
    }

    return service as T;
  }

  clone(): ServiceContainer {
    return new ServiceContainer().setServices({ ...this._services });
  }

  // TODO(dmaretskyi): `getService` is designed to error at runtime if the service is not available, but Layer forces us to provide all services and makes stubs for the ones that are not available.
  createLayer(): Layer.Layer<RuntimeServices> {
    const ai =
      this._services.ai != null ? Layer.succeed(AiService.AiService, this._services.ai) : AiService.notAvailable;
    const credentials = Layer.succeed(
      CredentialsService,
      this._services.credentials ?? new ConfiguredCredentialsService(),
    );
    const database =
      this._services.database != null
        ? Layer.succeed(DatabaseService, this._services.database)
        : DatabaseService.notAvailable;
    const queues =
      this._services.queues != null ? Layer.succeed(QueueService, this._services.queues) : QueueService.notAvailable;
    const tracing = Layer.succeed(TracingService, this._services.tracing ?? TracingService.noop);
    const eventLogger = Layer.succeed(ComputeEventLogger, this._services.eventLogger ?? ComputeEventLogger.noop);
    const functionCallService = Layer.succeed(
      RemoteFunctionExecutionService,
      this._services.functionCallService ?? RemoteFunctionExecutionService.mock(),
    );

    return Layer.mergeAll(ai, credentials, database, queues, tracing, eventLogger, functionCallService);
  }
}

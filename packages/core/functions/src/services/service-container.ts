//
// Copyright 2025 DXOS.org
//

import { Layer, type Context } from 'effect';

import { AiService } from './ai';
import { ConfiguredCredentialsService, CredentialsService } from './credentials';
import { DatabaseService } from './database';
import { EventLogger } from './event-logger';
import { FunctionCallService } from './function-call-service';
import { QueueService } from './queues';
import { ToolResolverService } from './tool-resolver';
import { TracingService } from './tracing';

/**
 * List of all service tags and their names.
 */
export interface ServiceTagRecord {
  ai: AiService;
  credentials: CredentialsService;
  database: DatabaseService;
  eventLogger: EventLogger;
  functionCallService: FunctionCallService;
  tracing: TracingService;
  queues: QueueService;
  toolResolver: ToolResolverService;
}

/**
 * List of all services and their runtime types.
 */
export type ServiceRecord = {
  [K in keyof ServiceTagRecord]: Context.Tag.Service<ServiceTagRecord[K]>;
};

/**
 * Union of all services.
 */
export type Services = ServiceTagRecord[keyof ServiceTagRecord];

const SERVICE_MAPPING: Record<string, keyof ServiceRecord> = {
  [AiService.key]: 'ai',
  [CredentialsService.key]: 'credentials',
  [DatabaseService.key]: 'database',
  [EventLogger.key]: 'eventLogger',
  [FunctionCallService.key]: 'functionCallService',
  [QueueService.key]: 'queues',
  [TracingService.key]: 'tracing',
  [ToolResolverService.key]: 'toolResolver',
};

export const SERVICE_TAGS: Context.Tag<any, any>[] = [
  AiService,
  CredentialsService,
  DatabaseService,
  EventLogger,
  FunctionCallService,
  TracingService,
  QueueService,
];

const DEFAULT_SERVICES: Partial<ServiceRecord> = {
  tracing: TracingService.noop,
};

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

  // TODO(dmaretskyi): `getService` is designed to error at runtime if the service is not available, but layer forces us to provide all services and makes stubs for the ones that are not available.
  createLayer(): Layer.Layer<Services> {
    const ai = this._services.ai != null ? Layer.succeed(AiService, this._services.ai) : AiService.notAvailable;
    const credentials = Layer.succeed(CredentialsService, new ConfiguredCredentialsService());
    const database =
      this._services.database != null
        ? Layer.succeed(DatabaseService, this._services.database)
        : DatabaseService.notAvailable;
    const queues =
      this._services.queues != null ? Layer.succeed(QueueService, this._services.queues) : QueueService.notAvailable;
    const tracing = Layer.succeed(TracingService, this._services.tracing ?? TracingService.noop);
    const eventLogger = Layer.succeed(EventLogger, this._services.eventLogger ?? EventLogger.noop);
    const functionCallService = Layer.succeed(
      FunctionCallService,
      this._services.functionCallService ?? FunctionCallService.mock(),
    );
    const toolResolver = Layer.succeed(
      ToolResolverService,
      this._services.toolResolver ?? ToolResolverService.notAvailable,
    );

    return Layer.mergeAll(
      //
      ai,
      credentials,
      database,
      queues,
      tracing,
      eventLogger,
      functionCallService,
      toolResolver,
    );
  }
}

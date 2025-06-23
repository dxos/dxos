//
// Copyright 2025 DXOS.org
//

import { type Context } from 'effect';

import { AiService } from './ai';
import { CredentialsService } from './credentials';
import { DatabaseService } from './database';
import { QueuesService } from './queues';
import { TracingService } from './tracing';

export interface Services {
  ai: Context.Tag.Service<AiService>;
  credentials: Context.Tag.Service<CredentialsService>;
  database: Context.Tag.Service<DatabaseService>;
  queues: Context.Tag.Service<QueuesService>;
  tracing: Context.Tag.Service<TracingService>;
}

const SERVICE_MAPPING: Record<string, keyof Services> = {
  [AiService.key]: 'ai',
  [CredentialsService.key]: 'credentials',
  [DatabaseService.key]: 'database',
  [QueuesService.key]: 'queues',
  [TracingService.key]: 'tracing',
};

const DEFAULT_SERVICES: Partial<Services> = {
  tracing: TracingService.noop,
};

export class ServiceContainer {
  private _services: Partial<Services> = { ...DEFAULT_SERVICES };

  /**
   * Set services.
   * @param services - Services to set.
   * @returns The container instance.
   */
  setServices(services: Partial<Services>): this {
    this._services = { ...this._services, ...services };
    return this;
  }

  getService<T extends Context.Tag<any, any>>(tag: T): Context.Tag.Service<T> {
    const serviceKey = SERVICE_MAPPING[tag.key];
    const service = serviceKey != null ? this._services[serviceKey] : undefined;
    if (!service) {
      throw new Error(`Service not available: ${tag.key}`);
    }
    return service as Context.Tag.Service<T>;
  }

  clone(): ServiceContainer {
    return new ServiceContainer().setServices({ ...this._services });
  }
}

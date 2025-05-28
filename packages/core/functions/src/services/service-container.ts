import { Context } from 'effect';
import { DatabaseService } from './database';
import { AiService } from './ai';
import { QueuesService } from './queues';

export interface Services {
  database: DatabaseService;
  ai: AiService;
  queues: QueuesService;
}

const SERVICE_MAPPING: Record<string, keyof Services> = {
  [DatabaseService.key]: 'database',
  [AiService.key]: 'ai',
  [QueuesService.key]: 'queues',
};

export class ServiceContainer {
  private _services: Partial<Services> = {};

  /**
   * Set services.
   * @param services - Services to set.
   * @returns The container instance.
   */
  setServices(services: Partial<Services>) {
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
}

import { Event } from '@dxos/async';
import type { QueryContext, QueryResult, QuerySource } from '../query/query';
import type { Filter } from '../query';

export class CoreDatabaseQueryContext implements QueryContext {
  added = new Event<QuerySource>();
  removed = new Event<QuerySource>();

  get sources(): QuerySource[] {
    return [];
  }

  start(): void {
    throw new Error('Method not implemented.');
  }
  stop(): void {
    throw new Error('Method not implemented.');
  }
}

export class CoreDatabaseQuerySource implements QuerySource {
  changed = new Event();

  getResults(): QueryResult<any>[] {
    throw new Error('Method not implemented.');
  }
  async run(filter: Filter<any>): Promise<QueryResult<any>[]> {
    throw new Error('Method not implemented.');
  }
  update(filter: Filter<any>): void {
    throw new Error('Method not implemented.');
  }
  close(): void {
    throw new Error('Method not implemented.');
  }
}

import { Event } from '@dxos/async';
import type { QueryContext, QueryResult, QuerySource } from '../query/query';
import type { Filter } from '../query';
import type { CoreDatabase } from './core-database';

export class CoreDatabaseQueryContext implements QueryContext {
  private readonly _coreDatabaseQuerySource: CoreDatabaseQuerySource;

  added = new Event<QuerySource>();
  removed = new Event<QuerySource>();

  constructor(coreDatabase: CoreDatabase) {
    this._coreDatabaseQuerySource = new CoreDatabaseQuerySource(coreDatabase);
  }

  get sources(): QuerySource[] {
    return [this._coreDatabaseQuerySource];
  }

  start(): void {
    this.added.emit(this._coreDatabaseQuerySource);
  }

  stop(): void {}
}

export class CoreDatabaseQuerySource implements QuerySource {
  private _lastResult: QueryResult<any>[] = [];

  changed = new Event();

  constructor(private readonly _coreDatabase: CoreDatabase) {}

  getResults(): QueryResult<any>[] {
    return this._lastResult;
  }

  async run(filter: Filter<any>): Promise<QueryResult<any>[]> {
    
    throw new Error('Method not implemented.');
  }

  update(filter: Filter<any>): void {
    
  }

  close(): void {
    
  }
}

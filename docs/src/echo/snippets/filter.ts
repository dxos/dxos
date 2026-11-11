//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type Database, DXN, Filter, Obj, Query, Type } from '@dxos/echo';

class Task extends Type.makeObject<Task>(
  DXN.make('com.example.type.task', '0.1.0'),
)(
  Schema.Struct({
    title: Schema.String,
    priority: Schema.Number,
    tags: Schema.Array(Schema.String),
  }),
) {}

declare const db: Database.Database;

// #region type
const urgent = Filter.type(Task, { priority: Filter.gte(8) });
const untyped = Filter.props<{ priority: number }>({ priority: 8 });
// #endregion

// #region compare
const midrange = Filter.type(Task, { priority: Filter.between(3, 7) });
const tagged = Filter.type(Task, { tags: Filter.contains('docs') });
// #endregion

// #region combine
const triage = Filter.and(
  Filter.type(Task),
  Filter.or(urgent, tagged),
  Filter.not(midrange),
);
const results = await db.query(Query.select(triage)).run();
// #endregion

// #region text
const matches = Filter.text('conflict resolution', { type: 'full-text' });
// #endregion

// #region time
const recent = Filter.updated({ after: new Date('2026-11-01') });
// #endregion

export { Obj, matches, recent, results, untyped };

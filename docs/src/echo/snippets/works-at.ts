//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Type } from '@dxos/echo';

import { Organization, Person } from '../../echo-tutorial/schema.ts';

// #region relation
export class WorksAt extends Type.makeRelation<WorksAt>(
  DXN.make('com.example.type.worksAt', '0.1.0'),
)({
  source: Person,
  target: Organization,
})({ role: Schema.String }) {}
// #endregion relation

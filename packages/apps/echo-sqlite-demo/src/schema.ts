//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Ref, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

/**
 * The whole data model. This is what a developer writes to get a graph: two types and a reference
 * between them, and the queries, reactivity and full-text search in the app come from these.
 */

export class Organization extends Type.makeObject<Organization>(DXN.make('sh.echo.demo.organization', '0.1.0'))(
  Schema.Struct({
    name: Schema.String,
  }),
) {}

export class Person extends Type.makeObject<Person>(DXN.make('sh.echo.demo.person', '0.1.0'))(
  Schema.Struct({
    name: Schema.String,
    email: Schema.String,
    /** The edge that makes this a graph rather than two tables. */
    employer: Schema.optional(Ref.Ref(Organization)),
  }),
) {}

export const types = [Organization, Person];

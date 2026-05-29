//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Ref } from '@dxos/echo';
import { Format } from '@dxos/echo/internal';

import * as Organization from './Organization';

/**
 * Reference to an external service or company.
 * Plain struct (not a Type.makeObject) — embedded inline by callers.
 * Parallel to Actor: human label + machine identifier + optional rich link.
 */
export const Provider = Schema.Struct({
  name: Schema.optional(Schema.String),
  domain: Format.Hostname.pipe(Schema.optional),
  ref: Ref.Ref(Organization.Organization).pipe(Schema.optional),
});

export interface Provider extends Schema.Schema.Type<typeof Provider> {}

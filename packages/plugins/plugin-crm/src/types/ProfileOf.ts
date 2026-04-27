//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { type Entity, Obj, Relation, Type } from '@dxos/echo';
import { Format } from '@dxos/echo/internal';

/**
 * Relation linking a Profile Document to its subject (Person or Organization).
 * A single Profile Document may participate in multiple ProfileOf relations
 * when a research run covers both a Person and their Organization.
 */
export const ProfileOf = Schema.Struct({
  id: Obj.ID,
  sources: Schema.Array(Schema.String).pipe(
    Schema.annotations({ description: 'URLs or provider identifiers that contributed to the profile.' }),
  ),
  lastResearchedAt: Format.DateTime.pipe(
    Schema.annotations({ description: 'Timestamp of the most recent research run.' }),
  ),
  summary: Schema.optional(
    Schema.String.pipe(Schema.annotations({ description: 'Short abstract of the profile (1-2 sentences).' })),
  ),
})
  .pipe(
    Type.relation({
      typename: 'org.dxos.relation.plugin-crm.profile-of',
      version: '0.1.0',
      source: Obj.Unknown,
      target: Obj.Unknown,
    }),
  )
  .annotations({
    description: 'Links a Profile Document to the Person or Organization it describes.',
  });

export interface ProfileOf extends Schema.Schema.Type<typeof ProfileOf> {}

export const make = (
  props: {
    [Relation.Source]: Obj.Any;
    [Relation.Target]: Obj.Any;
  } & Entity.Properties<Schema.Schema.Type<typeof ProfileOf>>,
) => Relation.make(ProfileOf, props);

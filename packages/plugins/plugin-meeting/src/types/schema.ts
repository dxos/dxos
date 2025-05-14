//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Expando, Ref, TypedObject } from '@dxos/echo-schema';

// TODO(wittjosiah): Factor out. Brand.
const IdentityDidSchema = Schema.String;

export const MeetingSchema = Schema.Struct({
  /**
   * User-defined name of the meeting.
   */
  name: Schema.optional(Schema.String),

  /**
   * The time the meeting was created.
   * Used to generate a fallback name if one is not provided.
   */
  created: Schema.String.annotations({ description: 'ISO timestamp' }),

  /**
   * List of dids of identities which joined some portion of the meeting.
   */
  participants: Schema.mutable(Schema.Array(IdentityDidSchema)),

  /**
   * Set of artifacts created during the meeting.
   * Keys are the typename of the artifact.
   * Values are a reference to the artifact object.
   * For example, a meeting may have a transcript, notes, and a summary.
   */
  artifacts: Schema.mutable(
    Schema.Record({
      key: Schema.String,
      value: Ref(Expando),
    }),
  ),
});

export class MeetingType extends TypedObject({
  typename: 'dxos.org/type/Meeting',
  version: '0.2.0',
})(MeetingSchema.fields) {}

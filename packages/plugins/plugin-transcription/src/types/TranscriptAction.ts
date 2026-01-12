//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { SpaceSchema } from '@dxos/client/echo';
import * as Operation from '@dxos/operation';
import { Transcript } from '@dxos/types';

import { meta } from '../meta';

//
// Operations
//

const TRANSCRIPT_OPERATION = `${meta.id}/operation`;

export namespace TranscriptOperation {
  export const Create = Operation.make({
    meta: { key: `${TRANSCRIPT_OPERATION}/create`, name: 'Create Transcript' },
    schema: {
      input: Schema.Struct({
        name: Schema.optional(Schema.String),
        space: SpaceSchema,
      }),
      output: Schema.Struct({
        object: Transcript.Transcript,
      }),
    },
  });
}

//
// Copyright 2025 DXOS.org
//

import { Operation } from '@dxos/operation';
import * as Schema from 'effect/Schema';

import { Database, Ref } from '@dxos/echo';

import { Markdown } from '@dxos/plugin-markdown/types';

export const CreateProposals = Operation.make({
  meta: {
    key: 'org.dxos.function.thread.create-proposals',
    name: 'Create Proposals',
    description: 'Proposes a set of changes to a document.',
  },
  input: Schema.Struct({
    doc: Ref.Ref(Markdown.Document).annotations({
      description: 'The ID of the document.',
    }),
    diffs: Schema.Array(Schema.String).annotations({
      description: 'The diffs to propose for the document.',
    }),
  }),
  output: Schema.Void,
  services: [Database.Service],
});

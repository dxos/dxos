//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Database } from '@dxos/echo';
import * as Operation from '@dxos/operation';
import { TypeInputOptionsAnnotation } from '@dxos/plugin-space/types';

import { meta } from '../meta';

import * as Graph from './Graph';

const EXPLORER_ACTION = `${meta.id}/action`;

export const GraphProps = Schema.Struct({
  name: Schema.optional(Schema.String),
  // TODO(wittjosiah): This should be a query input instead.
  typename: Schema.String.pipe(
    Schema.annotations({ title: 'Select type' }),
    TypeInputOptionsAnnotation.set({
      location: ['database', 'runtime'],
      kind: ['user'],
      registered: ['registered'],
    }),
    Schema.optional,
  ),
});

export class CreateGraph extends Schema.TaggedClass<CreateGraph>()(`${EXPLORER_ACTION}/create-graph`, {
  input: Schema.Struct({
    db: Database.Database,
  }).pipe(Schema.extend(GraphProps)),
  output: Schema.Struct({
    object: Graph.Graph,
  }),
}) {}

//
// Operations
//

const EXPLORER_OPERATION = `${meta.id}/operation`;

export namespace ExplorerOperation {
  export const CreateGraph = Operation.make({
    meta: { key: `${EXPLORER_OPERATION}/create-graph`, name: 'Create Graph' },
    schema: {
      input: Schema.Struct({
        db: Database.Database,
      }).pipe(Schema.extend(GraphProps)),
      output: Schema.Struct({
        object: Graph.Graph,
      }),
    },
  });
}

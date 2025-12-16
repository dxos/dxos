//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Effect from 'effect/Effect';
import * as Record from 'effect/Record';
import * as Schema from 'effect/Schema';

import { AiContextService, ArtifactId } from '@dxos/assistant';
import { Database, Ref } from '@dxos/echo';
import { trim } from '@dxos/util';

export const AssistantToolkit = Toolkit.make(
  Tool.make('add-to-context', {
    description: trim`
      Adds the object to the chat context.
    `,
    parameters: {
      id: ArtifactId.annotations({
        description: 'The ID of the document to read.',
      }),
    },
    success: Schema.Void,
    failure: Schema.Never,
    dependencies: [AiContextService, Database.Service],
  }),
);

export const tools = Record.keys(AssistantToolkit.tools);

export const layer = () =>
  AssistantToolkit.toLayer({
    ['add-to-context' as const]: Effect.fnUntraced(function* ({ id }) {
      const { binder } = yield* AiContextService;
      const { db } = yield* Database.Service;
      const ref = Ref.fromDXN(ArtifactId.toDXN(id, db.spaceId));
      yield* Effect.promise(() =>
        binder.bind({
          blueprints: [],
          objects: [ref],
        }),
      );
    }),
  });

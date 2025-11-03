//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Effect from 'effect/Effect';
import type * as Layer from 'effect/Layer';
import * as Record from 'effect/Record';
import * as Schema from 'effect/Schema';

import { AiContextService, ArtifactId } from '@dxos/assistant';
import { Ref } from '@dxos/echo';
import { DatabaseService } from '@dxos/functions';
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
    dependencies: [AiContextService, DatabaseService],
  }),
);

export const tools = Record.keys(AssistantToolkit.tools);

export const layer = () =>
  AssistantToolkit.toLayer({
    'add-to-context': Effect.fnUntraced(function* ({ id }) {
      const { binder } = yield* AiContextService;
      const { db } = yield* DatabaseService;
      const ref = Ref.fromDXN(ArtifactId.toDXN(id, db.spaceId));
      yield* Effect.promise(() =>
        binder.bind({
          blueprints: [],
          objects: [ref],
        }),
      );
    }),
  });

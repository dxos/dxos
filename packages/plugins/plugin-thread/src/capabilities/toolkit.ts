//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Schema from 'effect/Schema';

import { Capabilities, type PluginContext, contributes, createIntent } from '@dxos/app-framework';
import { ArtifactId, computeDiffsWithCursors } from '@dxos/assistant';
import { type SpaceId } from '@dxos/keys';
import { ClientCapabilities } from '@dxos/plugin-client';
import { type Markdown } from '@dxos/plugin-markdown/types';
import { createDocAccessor } from '@dxos/react-client/echo';
import { trim } from '@dxos/util';

import { ThreadAction } from '../types';

// TODO(wittjosiah): How to make this work for more than Documents?
class ThreadToolkit extends Toolkit.make(
  Tool.make('add-proposals', {
    description: trim`
      Proposes a set of changes to a document.
    `,
    parameters: {
      id: ArtifactId,
      diffs: Schema.Array(Schema.String).annotations({
        description: 'The diffs to propose for the document.',
      }),
    },
    success: Schema.Any,
    failure: Schema.Never,
  }),
) {
  static layer = (context: PluginContext) =>
    ThreadToolkit.toLayer({
      'add-proposals': ({ id, diffs: _diffs }) =>
        Effect.gen(function* () {
          // TODO(wittjosiah): Get capabilities via layers.
          const { dispatch } = context.getCapability(Capabilities.IntentDispatcher);
          const client = context.getCapability(ClientCapabilities.Client);
          const state = context.getCapability(Capabilities.Layout);

          const dxn = ArtifactId.toDXN(id, state.workspace as SpaceId);

          const echoDxn = dxn.asEchoDXN();
          if (!echoDxn) {
            throw new Error(`Invalid object ID: ${id}`);
          }

          const space = client.spaces.get(echoDxn.spaceId!);
          const object = space?.db.getObjectById<Markdown.Document>(echoDxn.echoId);
          if (!object) {
            throw new Error(`Object not found: ${id}`);
          }

          const content = yield* Effect.promise(() => object.content.load());
          const accessor = createDocAccessor(content, ['content']);
          yield* Function.pipe(
            computeDiffsWithCursors(accessor, _diffs),
            Array.map(({ cursor, text }) =>
              createIntent(ThreadAction.AddProposal, {
                subject: object,
                sender: { role: 'assistant' },
                anchor: cursor,
                text,
              }),
            ),
            Array.map(dispatch),
            Effect.allWith({ concurrency: 'unbounded' }),
          );
        }).pipe(Effect.orDie),
    });
}

export default (context: PluginContext) => [
  contributes(Capabilities.Toolkit, ThreadToolkit),
  contributes(Capabilities.ToolkitHandler, ThreadToolkit.layer(context)),
];

//
// Copyright 2025 DXOS.org
//

import { Tool, Toolkit } from '@effect/ai';
import { Effect, Schema } from 'effect';

import { Capabilities, type Capability, type PluginContext, contributes, createIntent } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { getActiveSpace } from '@dxos/plugin-space';
import { SpaceAction } from '@dxos/plugin-space/types';

import { MarkdownAction } from '../types';

// TODO(burdon): Reconcile with functions (currently reuses plugin framework intents).
class Toolkit extends Toolkit.make(
  Tool.make('create-document', {
    description: 'Creates a new markdown document.',
    parameters: {
      name: Schema.optional(Schema.String),
      content: Schema.optional(Schema.String),
    },
    // TODO(wittjosiah): Return document.
    success: Schema.Any,
    failure: Schema.Never,
  }),
) {
  static layer = (context: PluginContext) =>
    Toolkit.toLayer({
      'create-document': ({ name, content }) => {
        const { dispatch } = context.getCapability(Capabilities.IntentDispatcher);
        const space = getActiveSpace(context);
        invariant(space, 'No active space');

        return Effect.gen(function* () {
          const { object } = yield* dispatch(createIntent(MarkdownAction.Create, { name, content }));
          yield* dispatch(createIntent(SpaceAction.AddObject, { object, target: space }));
          return { id: object.id };
        }).pipe(Effect.orDie);
      },
    });
}

export default (context: PluginContext): Capability<any>[] => [
  contributes(Capabilities.Toolkit, Toolkit),
  contributes(Capabilities.ToolkitHandler, Toolkit.layer(context)),
];

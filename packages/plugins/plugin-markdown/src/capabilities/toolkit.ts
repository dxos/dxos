//
// Copyright 2025 DXOS.org
//

import { AiTool, AiToolkit } from '@effect/ai';
import { Effect, Schema } from 'effect';

import { Capabilities, type PluginContext, contributes } from '@dxos/app-framework';
import { ArtifactId } from '@dxos/assistant';
import { DatabaseService } from '@dxos/functions';
import { getActiveSpace } from '@dxos/plugin-space';
import { trim } from '@dxos/util';

import { Markdown } from '../types';

// TODO(burdon): Require response in diff format or with line numbers:
// - old line content
// + new line content

// TODO(burdon): Query for document by name.

class Toolkit extends AiToolkit.make(
  AiTool.make('load-document', {
    description: trim`
      Retrieves the content of a markdown document.
    `,
    parameters: {
      id: ArtifactId,
    },
    success: Schema.Struct({
      content: Schema.String,
    }),
    failure: Schema.Any,
  }),
) {
  static layer = (context: PluginContext) =>
    Toolkit.toLayer({
      'load-document': ({ id }) =>
        Effect.gen(function* () {
          const object = yield* DatabaseService.resolve(ArtifactId.toDXN(id), Markdown.Document);
          const content = yield* Effect.promise(() => object.content.load());
          return { content: content.content };
        }).pipe(wrapper(context)),
    });
}

// TODO(burdon): Factor out.
const wrapper = (context: PluginContext) => {
  const space = getActiveSpace(context);
  return Effect.provide(space ? DatabaseService.layer(space.db) : DatabaseService.notAvailable);
};

export default (context: PluginContext) => [
  contributes(Capabilities.Toolkit, Toolkit),
  contributes(Capabilities.ToolkitHandler, Toolkit.layer(context)),
];

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

class SchemaToolkit extends AiToolkit.make(
  AiTool.make('load-document', {
    description: trim`
      Retrieves markdown document.
    `,
    parameters: {
      id: ArtifactId,
    },
    success: Schema.String,
    failure: Schema.Any, // TODO(burdon): ???
  }),
) {
  static layer = (context: PluginContext) =>
    SchemaToolkit.toLayer({
      'load-document': ({ id }) => {
        console.log(context);
        console.log(id);
        const space = getActiveSpace(context);
        console.log(space); // undefined
        const service = space ? DatabaseService.layer(space.db) : DatabaseService.notAvailable;
        return Effect.gen(function* () {
          const object = yield* DatabaseService.resolve(ArtifactId.toDXN(id), Markdown.Document);
          const loadedContent = yield* Effect.promise(() => object.content?.load());
          return loadedContent?.content;
        }).pipe(Effect.provide(service));
      },
    });
}

// index.tsx:86 Error: Database not available
//     at get db (database.ts:23:13)
//     at database.ts:55:15
//     at :9009/AiToolkit.handler
//     at toolFunctionHandler (services.ts:47:27)
//     at toolFunctionHandler (AiToolkit.ts:176:41)
//     at :9009/AiToolkit.handler
//     at callTool (exec.ts:24:94)
//     at callTool (session.ts:236:11)
//     at AiSession.run (session.ts:265:52)
//     at AiConversation.run (conversation.ts:126:20)
//     at causeToError (errors.ts:121:25)
//     at throwCause (errors.ts:143:9)
//     at AiChatProcessor.request (chat-processor.ts:218:9)

export default (context: PluginContext) => [
  contributes(Capabilities.Toolkit, SchemaToolkit),
  contributes(Capabilities.ToolkitHandler, SchemaToolkit.layer(context)),
];

//
// Copyright 2025 DXOS.org
//

// ISSUE(burdon): defineArtifact
// @ts-nocheck

import * as Function from 'effect/Function';
import * as Schema from 'effect/Schema';

import { ToolResult, createTool } from '@dxos/ai';
import { Capability, Common, chain, createIntentModule } from '@dxos/app-framework';
import { ArtifactId, createArtifactElement } from '@dxos/assistant';
import { defineArtifact } from '@dxos/blueprints';
import { Obj } from '@dxos/echo';
import { assertArgument, invariant } from '@dxos/invariant';
import { SpaceAction } from '@dxos/plugin-space/types';
import { Filter } from '@dxos/react-client/echo';

import { meta } from '../meta';
import { Markdown, MarkdownAction } from '../types';

export default Capability.makeModule(() => {
  const definition = defineArtifact({
    id: `artifact:${meta.id}`, // TODO(burdon): meta.id/artifact?
    name: meta.name,
    instructions: `
      The markdown plugin allows you to work with text documents in the current space.
      Use these tools to interact with documents, including listing available documents and retrieving their content.
      Documents are stored in Markdown format.
    `,
    schema: Markdown.Document,
    tools: [
      createTool(meta.id, {
        name: 'create',
        description: 'Create a new markdown document',
        caption: 'Creating document...',
        schema: Schema.Struct({
          name: Schema.optional(Schema.String).annotations({
            description: 'Optional name for the document.',
          }),
          content: Schema.String.annotations({
            description: 'The content of the document.',
          }),
        }),
        execute: async ({ name, content }, { extensions }) => {
          invariant(extensions?.space, 'No space');
          invariant(extensions?.dispatch, 'No intent dispatcher');

          const intent = Function.pipe(
            createIntent(MarkdownAction.Create, {
              spaceId: extensions.space.id,
              name,
              content,
            }),
            chain(SpaceAction.AddObject, { target: extensions.space }),
          );

          const { data, error } = await extensions.dispatch(intent);
          if (!data || error) {
            return ToolResult.Error(error?.message ?? 'Failed to create document');
          }

          return ToolResult.Success(createArtifactElement(data.id));
        },
      }),
      createTool(meta.id, {
        name: 'list',
        description: 'List all markdown documents in the current space.',
        caption: 'Listing markdown documents...',
        schema: Schema.Struct({}),
        execute: async (_input, { extensions }) => {
          invariant(extensions?.space, 'No space');
          const space = extensions.space;
          const { objects: documents } = await space.db.query(Filter.type(Markdown.Document)).run();
          const documentInfo = documents.map((doc) => {
            invariant(Obj.instanceOf(Markdown.Document, doc));
            return {
              id: Obj.getDXN(doc).toString(),
              name: doc.name || doc.fallbackName || 'Unnamed Document',
              // TODO(ZaymonFC): Include updatedAt?
            };
          });

          return ToolResult.Success(documentInfo);
        },
      }),
      createTool(meta.id, {
        name: 'inspect',
        description: 'Read the content of a markdown document.',
        caption: 'Inspecting markdown document...',
        schema: Schema.Struct({
          id: ArtifactId,
        }),
        execute: async ({ id }, { extensions }) => {
          invariant(extensions?.space, 'No space');
          const document = await extensions.space.db.query(Filter.id(ArtifactId.toDXN(id).toString())).first();
          assertArgument(Obj.instanceOf(Markdown.Document, document), 'document', 'Invalid type');

          const { content } = await document.content?.load();
          return ToolResult.Success({
            id: Obj.getDXN(document).toString(),
            name: document.name || document.fallbackName || 'Unnamed Document',
            content,
          });
        },
      }),
    ],
  });

  return Capability.contributes(Common.Capability.ArtifactDefinition, definition);
});

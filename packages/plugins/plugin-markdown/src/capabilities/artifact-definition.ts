//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PromiseIntentDispatcher } from '@dxos/app-framework';
import { defineArtifact, defineTool, ToolResult } from '@dxos/artifact';
import { isInstanceOf, S } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { fullyQualifiedId, Filter, type Space } from '@dxos/react-client/echo';

import { DocumentType } from '../types';

// TODO(burdon): Factor out.
declare global {
  interface ToolContextExtensions {
    space?: Space;
    dispatch?: PromiseIntentDispatcher;
  }
}

export default () => {
  const definition = defineArtifact({
    id: 'plugin-markdown',
    instructions: `
      The markdown plugin allows you to work with text documents in the current space.
      Use these tools to interact with documents, including listing available documents and retrieving their content.
      Documents are stored in Markdown format.
    `,
    schema: DocumentType,
    tools: [
      defineTool({
        name: 'document_list',
        description: 'List all markdown documents in the current space.',
        schema: S.Struct({}),
        execute: async (_input, { extensions }) => {
          invariant(extensions?.space, 'No space');
          const space = extensions.space;
          const { objects: documents } = await space.db.query(Filter.schema(DocumentType)).run();
          const documentInfo = documents.map((doc) => {
            invariant(isInstanceOf(DocumentType, doc));
            return {
              id: fullyQualifiedId(doc),
              name: doc.name || doc.fallbackName || 'Unnamed Document',
              // TODO(ZaymonFC): Include updatedAt?
            };
          });

          return ToolResult.Success(documentInfo);
        },
      }),
      defineTool({
        name: 'document_read',
        description: 'Read the content of a markdown document.',
        schema: S.Struct({
          id: S.String.annotations({
            description: 'The fully qualified ID of the document `spaceID:objectID`',
          }),
        }),
        execute: async ({ id }, { extensions }) => {
          invariant(extensions?.space, 'No space');
          const space = extensions.space;
          const { objects: documents } = await space.db.query(Filter.schema(DocumentType)).run();
          const document = documents.find((doc) => fullyQualifiedId(doc) === id);
          if (!document) {
            return ToolResult.Error(`Document not found: ${id}`);
          }

          invariant(isInstanceOf(DocumentType, document));

          const { content } = await document.content?.load();
          return ToolResult.Success({
            id: fullyQualifiedId(document),
            name: document.name || document.fallbackName || 'Unnamed Document',
            content,
          });
        },
      }),
    ],
  });

  return contributes(Capabilities.ArtifactDefinition, definition);
};

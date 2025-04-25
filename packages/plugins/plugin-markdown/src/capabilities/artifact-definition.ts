//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PromiseIntentDispatcher } from '@dxos/app-framework';
import { ArtifactId, defineArtifact, defineTool, ToolResult } from '@dxos/artifact';
import { isInstanceOf, S } from '@dxos/echo-schema';
import { invariant, assertArgument } from '@dxos/invariant';
import { Filter, fullyQualifiedId, type Space } from '@dxos/react-client/echo';

import { meta } from '../meta';
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
    id: `artifact:${meta.id}`,
    name: meta.name,
    instructions: `
      - The markdown plugin allows you to work with text documents in the current space.
      - Use these tools to interact with documents, including listing available documents, retrieving their content, and adding suggestions.
      - Documents are stored in Markdown format.
      - When using the 'suggest' tool, your suggestion will be appended to the document within a code fence annotated as a suggestion.
    `,
    schema: DocumentType,
    tools: [
      defineTool(meta.id, {
        name: 'list',
        description: 'List all markdown documents in the current space.',
        caption: 'Listing markdown documents...',
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
      defineTool(meta.id, {
        name: 'inspect',
        description: 'Read the content of a markdown document.',
        caption: 'Inspecting markdown document...',
        schema: S.Struct({
          id: ArtifactId,
        }),
        execute: async ({ id }, { extensions }) => {
          invariant(extensions?.space, 'No space');
          const document = await extensions.space.db.query({ id: ArtifactId.toDXN(id).toString() }).first();
          assertArgument(isInstanceOf(DocumentType, document), 'Invalid type');

          const { content } = await document.content?.load();
          return ToolResult.Success({
            id: fullyQualifiedId(document),
            name: document.name || document.fallbackName || 'Unnamed Document',
            content,
          });
        },
      }),
      defineTool(meta.id, {
        name: 'suggest',
        description: 'Append a suggestion to a markdown document.',
        caption: 'Adding suggestion to markdown document...',
        schema: S.Struct({
          id: ArtifactId,
          suggestion: S.String,
        }),
        execute: async ({ id, suggestion }, { extensions }) => {
          invariant(extensions?.space, 'No space');
          const document = await extensions.space.db.query({ id: ArtifactId.toDXN(id).toString() }).first();
          assertArgument(isInstanceOf(DocumentType, document), 'Invalid type');

          const contentRef = await document.content?.load();
          invariant(contentRef, 'Document content not found');

          // Format the suggestion with a code fence
          const formattedSuggestion = `\n\n\`\`\`suggestion\n${suggestion}\n\`\`\``;

          // Append the suggestion to the existing content
          contentRef.content = contentRef.content + formattedSuggestion;

          return ToolResult.Success({
            id: fullyQualifiedId(document),
            name: document.name || document.fallbackName || 'Unnamed Document',
            content: contentRef.content,
          });
        },
      }),
    ],
  });

  return contributes(Capabilities.ArtifactDefinition, definition);
};

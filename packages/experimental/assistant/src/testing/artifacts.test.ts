//
// Copyright 2025 DXOS.org
//

/*
import { Schema as S } from '@effect/schema';
import { describe, test } from 'vitest';

import { ObjectId, toJsonSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { AIServiceEdgeClient, Tool } from '../ai-service';
import { defineTool, ToolResult } from '../conversation';

// TODO(dmaretskyi): Effect schema.
const ArtifactDef = S.Struct({
  typename: S.String,
  description: S.String,
  schema: S.Any,
  actions: S.Array(Tool),
}).pipe(S.mutable);

type ArtifactDef = S.Schema.Type<typeof ArtifactDef>;

const ListItem = S.Struct({
  name: S.String,
});

const ListSchema = S.Struct({
  id: ObjectId,
  title: S.String,
  items: S.Array(ListItem).pipe(S.mutable),
}).pipe(S.mutable);

type ListSchema = S.Schema.Type<typeof ListSchema>;

const list: ArtifactDef = {
  typename: 'example.com/type/List',
  description: 'Ordered set of text items.',
  schema: ListSchema,
  actions: [
    defineTool('list', {
      name: 'query',
      description: 'Query all lists',
      schema: S.Struct({}),
      execute: async ({}, context) => {
        return ToolResult.Success(LISTS[id]);
      },
    }),
    defineTool('list', {
      name: 'inspect',
      description: 'Get contents of the list',
      schema: S.Struct({
        id: ObjectId.annotations({ description: 'The list to inspect' }),
      }),
      execute: async ({ id }, context) => {
        return ToolResult.Success(LISTS[id]);
      },
    }),
    defineTool('list', {
      name: 'create',
      description: 'Add one or more items to an existing list',
      schema: S.Struct({
        id: ObjectId.annotations({ description: 'The list to add items to' }),
        items: S.Array(ListItem).annotations({ description: 'The items to add to the list' }),
      }),
      execute: async ({ id, items }, context) => {
        LISTS[id].items.push(...items);
        return ToolResult.Success(LISTS[id]);
      },
    }),
  ],
};

const LISTS: Record<ObjectId, ListSchema> = {};

const artifacts = [list];

const getArtifactDefinitions = defineTool('system', {
  name: 'getArtifactDefinitions',
  description: 'Queries the definitions and metadata of artifacts defined in the system',
  schema: S.Any,
  execute: async (_, context) => {
    return ToolResult.Success(
      artifacts.map((artifact) => ({
        typename: artifact.typename,
        description: artifact.description,
        schema: toJsonSchema(artifact.schema),
        actions: artifact.actions.map((action) => ({
          name: action.name,
          description: action.description,
        })),
      })),
    );
  },
});

const ARTIFACT_INSTRUCTIONS = `
You have ability to interact with artifacts.
Artifacts are persistent structured objects that have actions associated with them.

Before replying to the user you should first query the artifact definitions and metadata.
If there's

`;

describe('Artifacts', () => {
  test('shopping list', async () => {
    const client = new AIServiceEdgeClient({
      endpoint: ENDPOINT,
    });

    const custodian: Tool = {
      name: 'custodian',
      description: 'Custodian can tell you the password if you say the magic word',
      parameters: toJsonSchema(
        S.Struct({
          magicWord: S.String.annotations({ description: 'The magic word. Should be exactly "pretty please"' }),
        }),
      ),
    };

    const spaceId = SpaceId.random();
    const threadId = ObjectId.random();

    await client.appendMessages([
      {
        id: ObjectId.random(),
        spaceId,
        threadId,
        role: 'user',
        content: [{ type: 'text', text: 'What is the password? Ask the custodian' }],
      },
    ]);

    const stream = await client.generate({
      model: DEFAULT_EDGE_MODEL,
      spaceId,
      threadId,
      systemPrompt: 'You are a helpful assistant.',
      tools: [custodian],
    });
    for await (const event of stream) {
      log.info('event', event);
    }
    const [message] = await stream.complete();
    log.info('full message', {
      message,
    });
    await client.appendMessages([message]);

    const toolUse = message.content.find(({ type }) => type === 'tool_use')!;
    invariant(toolUse.type === 'tool_use');
    await client.appendMessages([
      {
        id: ObjectId.random(),
        spaceId,
        threadId,
        role: 'user',
        content: [{ type: 'tool_result', toolUseId: toolUse.id, content: 'password="The sky is gray"' }],
      },
    ]);

    const stream2 = await client.generate({
      model: DEFAULT_EDGE_MODEL,
      spaceId,
      threadId,
      systemPrompt: 'You are a helpful assistant.',
      tools: [custodian],
    });
    for await (const event of stream2) {
      log.info('event', event);
    }
    const [message2] = await stream2.complete();
    log.info('full message', {
      message: message2,
    });
  });
});
*/

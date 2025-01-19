import { Schema as S } from '@effect/schema';
import { LLMTool } from '../ai-service';
import { defineTool, LLMToolResult } from '../conversation';
import { ObjectId, toJsonSchema } from '@dxos/echo-schema';
import { describe, test } from 'vitest';

// TODO(dmaretskyi): Effect schema.
const ArtifactDef = S.Struct({
  typename: S.String,
  description: S.String,
  schema: S.Any,
  actions: S.Array(LLMTool),
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
    defineTool({
      name: 'list.query',
      description: 'Query all lists',
      schema: S.Struct({}),
      execute: async ({}, context) => {
        return LLMToolResult.Success(LISTS[id]);
      },
    }),
    defineTool({
      name: 'list.inspect',
      description: 'Get contents of the list',
      schema: S.Struct({
        id: ObjectId.annotations({ description: 'The list to inspect' }),
      }),
      execute: async ({ id }, context) => {
        return LLMToolResult.Success(LISTS[id]);
      },
    }),
    defineTool({
      name: 'list.add',
      description: 'Add one or more items to an existing list',
      schema: S.Struct({
        id: ObjectId.annotations({ description: 'The list to add items to' }),
        items: S.Array(ListItem).annotations({ description: 'The items to add to the list' }),
      }),
      execute: async ({ id, items }, context) => {
        LISTS[id].items.push(...items);
        return LLMToolResult.Success(LISTS[id]);
      },
    }),
  ],
};

const LISTS: Record<ObjectId, ListSchema> = {};

const artifacts = [list];

const getArtifactDefinitions = defineTool({
  name: 'getArtifactDefinitions',
  description: 'Queries the definitions and metadata of artifacts defined in the system',
  schema: S.Any,
  execute: async (_, context) => {
    return LLMToolResult.Success(
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
    const client = new AIServiceClientImpl({
      endpoint: ENDPOINT,
    });

    const custodian: LLMTool = {
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

    await client.insertMessages([
      {
        id: ObjectId.random(),
        spaceId,
        threadId,
        role: 'user',
        content: [{ type: 'text', text: 'What is the password? Ask the custodian' }],
      },
    ]);

    const stream = await client.generate({
      model: '@anthropic/claude-3-5-haiku-20241022',
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
    await client.insertMessages([message]);

    const toolUse = message.content.find(({ type }) => type === 'tool_use')!;
    invariant(toolUse.type === 'tool_use');
    await client.insertMessages([
      {
        id: ObjectId.random(),
        spaceId,
        threadId,
        role: 'user',
        content: [{ type: 'tool_result', toolUseId: toolUse.id, content: 'password="The sky is gray"' }],
      },
    ]);

    const stream2 = await client.generate({
      model: '@anthropic/claude-3-5-haiku-20241022',
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

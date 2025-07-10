import { ConsolePrinter, createTool, ToolRegistry, ToolResult } from '@dxos/ai';
import { ArtifactId } from '@dxos/artifact';
import { AISession, Blueprint } from '@dxos/assistant';
import { Obj, Type } from '@dxos/echo';
import type { EchoDatabase, QueueFactory } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { AiService, DatabaseService, ToolResolverService, type ServiceContainer } from '@dxos/functions';
import { createTestServices } from '@dxos/functions/testing';
import { log } from '@dxos/log';
import { Schema } from 'effect';
import { beforeAll, describe, test } from 'vitest';

declare global {
  interface ToolContextExtensions {
    serviceContainer?: ServiceContainer;
  }
}

const TextDocument = Schema.Struct({
  content: Schema.String.annotations({ description: 'The content of the document.' }),
}).pipe(
  Type.Obj({
    typename: 'example.org/type/TextDocument',
    version: '0.1.0',
  }),
);
interface TextDocument extends Schema.Schema.Type<typeof TextDocument> {}

const readDocument = createTool('test', {
  name: 'readDocument',
  description: 'Read the design spec document.',
  schema: Schema.Struct({
    // TODO(dmaretskyi): Imagine if this could be an ECHO ref. (*_*)
    id: ArtifactId.annotations({ description: 'The ID of the document to read.' }),
  }),
  execute: async ({ id }, { extensions }) => {
    const { db } = extensions!.serviceContainer!.getService(DatabaseService);
    const doc = await db.graph.createRefResolver({ context: { space: db.spaceId } }).resolve(ArtifactId.toDXN(id));
    if (!doc) {
      return ToolResult.Error('Document not found.');
    }

    return ToolResult.Success({ content: doc.content });
  },
});

const writeDocument = createTool('test', {
  name: 'writeDocument',
  description: 'Write the design spec document.',
  schema: Schema.Struct({
    id: ArtifactId.annotations({ description: 'The ID of the document to write.' }),
    content: Schema.String.annotations({ description: 'New content to write to the document.' }),
  }),
  execute: async ({ id, content }, { extensions }) => {
    const { db } = extensions!.serviceContainer!.getService(DatabaseService);
    const doc = await db.graph.createRefResolver({ context: { space: db.spaceId } }).resolve(ArtifactId.toDXN(id));
    if (!doc) {
      return ToolResult.Error('Document not found.');
    }

    doc.content = content;
    console.log('writeDocument', content);
    return ToolResult.Success('Document updated.');
  },
});

const DESIGN_SPEC_BLUEPRINT = Obj.make(Blueprint, {
  name: 'Design Spec',
  description: 'Preserve the conversation in the design spec.',
  instructions: `
    You manage a design spec based on the conversation.
    The design spec is a document that captures the design of a product.
    The design spec document is a markdown file.
    The design spec document follows a hierarchical structure, with nested markdown bulleted sections.
    You use appropriate tools to read and write the design spec document.
    Maintain the document so that it can convey all relevant points from the conversation.
    When replying to the user, be terse with your comments about design doc handling.
    You do not announce when you read or write the design spec document.
  `,
  tools: [readDocument.id, writeDocument.id],
  artifacts: [],
});

describe.runIf(process.env.DX_RUN_SLOW_TESTS === '1')('Blueprint', { timeout: 120_000 }, () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;
  let queues: QueueFactory;
  let serviceContainer: ServiceContainer;

  beforeAll(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db, queues } = await builder.createDatabase({ types: [TextDocument] }));

    // TODO(dmaretskyi): Helper to scaffold this from a config.
    serviceContainer = createTestServices({
      ai: {
        provider: 'edge',
      },
      db,
      queues,
      logging: {
        enabled: true,
      },
      toolResolver: ToolResolverService.make(new ToolRegistry([readDocument, writeDocument])),
    });
  });

  test('spec blueprint', async () => {
    const doc = db.add(Obj.make(TextDocument, { content: 'Hello, world!' }));

    const session = new AISession({
      operationModel: 'configured',
    });
    const printer = new ConsolePrinter();
    session.message.on((message) => printer.printMessage(message));
    session.userMessage.on((message) => printer.printMessage(message));
    session.block.on((block) => printer.printContentBlock(block));

    await session.run({
      client: serviceContainer.getService(AiService).client,
      history: [],
      prompt: `
        Let's design a new feature for our product. We need to add a user profile system with the following requirements:

        1. Users should be able to create and edit their profiles
        2. Profile should include basic info like name, bio, avatar
        3. Users can control privacy settings for their profile
        4. Profile should show user's activity history
        5. Need to consider data storage and security implications

        What do you think about this approach? Let's capture the key design decisions in our spec.

        Store spec in ${Obj.getDXN(doc)}
      `,
      systemPrompt: DESIGN_SPEC_BLUEPRINT.instructions,
      tools: [...DESIGN_SPEC_BLUEPRINT.tools],
      toolResolver: serviceContainer.getService(ToolResolverService).toolResolver,
      artifacts: [],
      extensions: {
        serviceContainer,
      },
    });

    log.info('spec', { doc });
  });
});

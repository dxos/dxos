import { ConsolePrinter, createTool, ToolRegistry, ToolResult } from '@dxos/ai';
import { AISession, Blueprint } from '@dxos/assistant';
import { Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { AiService, ToolResolverService, type ServiceContainer } from '@dxos/functions';
import { createTestServices } from '@dxos/functions/testing';
import { Schema } from 'effect';
import { beforeAll, describe, test } from 'vitest';

describe.runIf(process.env.DX_RUN_SLOW_TESTS === '1')('Blueprint', { timeout: 120_000 }, () => {
  let serviceContainer: ServiceContainer;
  beforeAll(async () => {
    // TODO(dmaretskyi): Helper to scaffold this from a config.
    serviceContainer = createTestServices({
      ai: {
        provider: 'edge',
      },
      logging: {
        enabled: true,
      },
    });
  });

  test('spec blueprint', async () => {
    const content = '';

    const readDocument = createTool('test', {
      name: 'readDocument',
      description: 'Read the design spec document.',
      schema: Schema.Struct({}),
      execute: async () => {
        return ToolResult.Success({ content });
      },
    });
    const writeDocument = createTool('test', {
      name: 'writeDocument',
      description: 'Write the design spec document.',
      schema: Schema.Struct({
        content: Schema.String.annotations({ description: 'New content to write to the document.' }),
      }),
      execute: async ({ content }) => {
        content = content;
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

    const session = new AISession({
      operationModel: 'configured',
    });
    const printer = new ConsolePrinter();
    session.message.on((message) => printer.printMessage(message));
    session.userMessage.on((message) => printer.printMessage(message));
    session.block.on((block) => printer.printContentBlock(block));

    const result = await session.run({
      client: serviceContainer.getService(AiService).client,
      history: [],
      prompt: `Let's design a new feature for our product. We need to add a user profile system with the following requirements:

1. Users should be able to create and edit their profiles
2. Profile should include basic info like name, bio, avatar
3. Users can control privacy settings for their profile
4. Profile should show user's activity history
5. Need to consider data storage and security implications

What do you think about this approach? Let's capture the key design decisions in our spec.`,
      systemPrompt: DESIGN_SPEC_BLUEPRINT.instructions,
      tools: [...DESIGN_SPEC_BLUEPRINT.tools],
      toolResolver: new ToolRegistry([readDocument, writeDocument]),
      artifacts: [],
    });
  });
});

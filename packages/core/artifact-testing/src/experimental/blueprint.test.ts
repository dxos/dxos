//
// Copyright 2025 DXOS.org
//

import { Effect, Schema, Struct } from 'effect';
import { beforeAll, describe, expect, test } from 'vitest';

import { ConsolePrinter, createTool, Message, ToolRegistry, ToolResult, type ExecutableTool } from '@dxos/ai';
import { ArtifactId } from '@dxos/artifact';
import { AISession, Blueprint, BlueprintBinding } from '@dxos/assistant';
import { Obj, Ref, Type } from '@dxos/echo';
import type { EchoDatabase, Queue, QueueFactory } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import {
  AiService,
  DatabaseService,
  defineFunction,
  FunctionExecutor,
  ToolResolverService,
  type FunctionDefinition,
  type ServiceContainer,
} from '@dxos/functions';
import { createTestServices } from '@dxos/functions/testing';
import { log } from '@dxos/log';
import { ComplexSet } from '@dxos/util';

declare global {
  interface ToolContextExtensions {
    serviceContainer?: ServiceContainer;
  }
}

// TODO(dmaretskyi): Find a good home for this.
const toolFromFunction = <I, O>(namespace: string, name: string, func: FunctionDefinition<I, O>): ExecutableTool => {
  return createTool(namespace, {
    name,
    description: func.description,
    schema: func.inputSchema,
    execute: async (input, { extensions }) => {
      const serviceContainer = extensions?.serviceContainer;
      if (!serviceContainer) {
        throw new Error('Service container not provided.');
      }

      const invoker = new FunctionExecutor(serviceContainer);
      try {
        const result = await invoker.invoke(func, input);
        return ToolResult.Success(result);
      } catch (error) {
        return ToolResult.Error(error instanceof Error ? error.message : 'Unknown error.');
      }
    },
  });
};

const TextDocument = Schema.Struct({
  content: Schema.String.annotations({ description: 'The content of the document.' }),
}).pipe(
  Type.Obj({
    typename: 'example.org/type/TextDocument',
    version: '0.1.0',
  }),
);
interface TextDocument extends Schema.Schema.Type<typeof TextDocument> {}

const readDocument = toolFromFunction(
  'test',
  'readDocument',
  defineFunction({
    description: 'Read the design spec document.',
    inputSchema: Schema.Struct({
      // TODO(dmaretskyi): Imagine if this could be an ECHO ref. (*_*)
      id: ArtifactId.annotations({ description: 'The ID of the document to read.' }),
    }),
    outputSchema: Schema.Struct({
      content: Schema.String,
    }),
    handler: Effect.fn(function* ({ data: { id } }) {
      const doc = yield* DatabaseService.resolve(ArtifactId.toDXN(id));
      if (!doc || !Obj.instanceOf(TextDocument, doc)) {
        throw new Error('Document not found.');
      }

      return { content: doc.content };
    }),
  }),
);

const writeDocument = toolFromFunction(
  'test',
  'writeDocument',
  defineFunction({
    description: 'Write the design spec document.',
    inputSchema: Schema.Struct({
      id: ArtifactId.annotations({ description: 'The ID of the document to write.' }),
      content: Schema.String.annotations({ description: 'New content to write to the document.' }),
    }),
    outputSchema: Schema.String,
    handler: Effect.fn(function* ({ data: { id, content } }) {
      const doc = yield* DatabaseService.resolve(ArtifactId.toDXN(id));
      if (!doc || !Obj.instanceOf(TextDocument, doc)) {
        throw new Error('Document not found.');
      }

      doc.content = content;
      console.log('writeDocument', content);
      return 'Document updated.';
    }),
  }),
);

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
  // TODO(dmaretskyi): Create tool.
  tools: [readDocument.id, writeDocument.id],
  artifacts: [],
});

const TASK_LIST_BLUEPRINT = Obj.make(Blueprint, {
  name: 'Task List',
  description: 'Manages a list of tasks.',
  instructions: `
    You manage a list of tasks.
    The task list is a document that captures list of tasks.
    The task list document is a markdown file.
    The task list document follows a hierarchical structure, with nested markdown bulleted sections, keyed by "-".
    You use appropriate tools to read and write the task list document.
    When replying to the user, be terse with your comments about task list handling.
    You do not announce when you read or write the task list document.
  `,
  // TODO(dmaretskyi): Create tool.
  tools: [readDocument.id, writeDocument.id],
  artifacts: [],
});

interface ConversationRunOptions {
  prompt: string;
}

type ConversationOptions = {
  serviceContainer: ServiceContainer;
  queue: Queue<Message | BlueprintBinding>;
  onBegin?: (session: AISession) => void;
  onEnd?: (session: AISession) => void;
};

/**
 * Persistent conversation state.
 * Context + history + artifacts.
 * Backed by a Queue.
 */
export class Conversation {
  private readonly _serviceContainer: ServiceContainer;
  private readonly _queue: Queue<Message | BlueprintBinding>;
  private readonly _onBegin?: (session: AISession) => void = undefined;
  private readonly _onEnd?: (session: AISession) => void = undefined;

  constructor(options: ConversationOptions) {
    this._serviceContainer = options.serviceContainer;
    this._queue = options.queue;
    this._onBegin = options.onBegin;
    this._onEnd = options.onEnd;
  }

  readonly blueprints = {
    bind: async (blueprint: Ref.Ref<Blueprint>): Promise<void> => {
      await this._queue.append([
        Obj.make(BlueprintBinding, {
          added: [blueprint],
          removed: [],
        }),
      ]);
    },

    unbind: async (blueprint: Ref.Ref<Blueprint>): Promise<void> => {
      await this._queue.append([
        Obj.make(BlueprintBinding, {
          added: [],
          removed: [blueprint],
        }),
      ]);
    },

    query: async (): Promise<Ref.Ref<Blueprint>[]> => {
      const queueItems = await this._queue.queryObjects();

      const bindings = new ComplexSet<Ref.Ref<Blueprint>>((ref) => ref.dxn.toString());
      for (const item of queueItems) {
        if (Obj.instanceOf(BlueprintBinding, item)) {
          for (const bp of item.removed) {
            bindings.delete(bp);
          }
          for (const bp of item.added) {
            bindings.add(bp);
          }
        }
      }
      return Array.from(bindings);
    },
  };

  async run(options: ConversationRunOptions) {
    const session = new AISession({
      operationModel: 'configured',
    });
    this._onBegin?.(session);

    const history = await this.getHistory();
    const blueprints = await Ref.Array.loadAll(await this.blueprints.query());
    if (blueprints.length > 1) {
      throw new Error('Multiple blueprints are not yet supported.');
    }

    const messages = await session.run({
      history,
      prompt: options.prompt,
      systemPrompt: blueprints.at(0)?.instructions,
      artifacts: [],
      tools: blueprints.at(0)?.tools ?? [],
      client: this._serviceContainer.getService(AiService).client,
      toolResolver: this._serviceContainer.getService(ToolResolverService).toolResolver,
      extensions: {
        serviceContainer: this._serviceContainer,
      },
    });

    await this._queue.append(messages);

    this._onEnd?.(session);
  }

  async getHistory(): Promise<Message[]> {
    const queueItems = await this._queue.queryObjects();
    return queueItems.filter(Obj.instanceOf(Message));
  }
}

describe.runIf(process.env.DX_RUN_SLOW_TESTS === '1')('Blueprint', { timeout: 120_000 }, () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;
  let queues: QueueFactory;
  let serviceContainer: ServiceContainer;

  beforeAll(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db, queues } = await builder.createDatabase({ types: [TextDocument, Blueprint] }));

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
    const printer = new ConsolePrinter();
    const conversation = new Conversation({
      serviceContainer,
      queue: queues.create(),
      onBegin: (session) => {
        session.message.on((message) => printer.printMessage(message));
        session.userMessage.on((message) => printer.printMessage(message));
        session.block.on((block) => printer.printContentBlock(block));
      },
    });

    await db.add(DESIGN_SPEC_BLUEPRINT);
    await conversation.blueprints.bind(Ref.make(DESIGN_SPEC_BLUEPRINT));

    const artifact = db.add(Obj.make(TextDocument, { content: 'Hello, world!' }));
    let prevContent = artifact.content;
    await conversation.run({
      prompt: `
        Let's design a new feature for our product. We need to add a user profile system with the following requirements:

        1. Users should be able to create and edit their profiles
        2. Profile should include basic info like name, bio, avatar
        3. Users can control privacy settings for their profile
        4. Profile should show user's activity history
        5. Need to consider data storage and security implications

        What do you think about this approach? Let's capture the key design decisions in our spec.

        Store spec in ${Obj.getDXN(artifact)}
      `,
    });
    log.info('spec 1', { doc: artifact });
    expect(artifact.content).not.toBe(prevContent);
    prevContent = artifact.content;

    await conversation.run({
      prompt: `
        I want this to be built on top of Durable Objects and SQLite database. Let's adjust the spec to reflect this.
      `,
    });
    log.info('spec 2', { doc: artifact });
    expect(artifact.content).not.toBe(prevContent);
  });

  test.only('building a shelf', async () => {
    const printer = new ConsolePrinter();
    const conversation = new Conversation({
      serviceContainer,
      queue: queues.create(),
      onBegin: (session) => {
        session.message.on((message) => printer.printMessage(message));
        session.userMessage.on((message) => printer.printMessage(message));
        session.block.on((block) => printer.printContentBlock(block));
      },
    });

    await db.add(TASK_LIST_BLUEPRINT);
    await conversation.blueprints.bind(Ref.make(TASK_LIST_BLUEPRINT));

    const artifact = db.add(Obj.make(TextDocument, { content: '' }));
    let prevContent = artifact.content;
    await conversation.run({
      prompt: `
        I'm building a shelf.
        
        I need a hammer, nails, and a saw.

        Store the shopping list in ${Obj.getDXN(artifact)}
      `,
    });
    log.info('spec 1', { doc: artifact });
    expect(artifact.content).not.toBe(prevContent);
    prevContent = artifact.content;

    await conversation.run({
      prompt: `
        I will need a board too.
      `,
    });
    log.info('spec 2', { doc: artifact });
    expect(artifact.content).not.toBe(prevContent);

    await conversation.run({
      prompt: `
        Actually lets use screws and a screwdriver.
      `,
    });
    log.info('spec 3', { doc: artifact });
    expect(artifact.content).not.toBe(prevContent);

    Object.entries({
      screwdriver: true,
      screws: true,
      board: true,
      saw: true,
      hammer: false,
      nails: false,
    }).forEach(([item, expected]) => {
      expect(artifact.content.toLowerCase().includes(item)).toBe(expected);
    });
  });
});

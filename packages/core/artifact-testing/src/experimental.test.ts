//
// Copyright 2025 DXOS.org
//

import { Effect, Schema } from 'effect';
import { inspect } from 'node:util';
import { beforeAll, describe, test } from 'vitest';

import { createTool, EdgeAiServiceClient, OllamaAiServiceClient, ToolRegistry, ToolResult } from '@dxos/ai';
import { AI_SERVICE_ENDPOINT, EXA_API_KEY } from '@dxos/ai/testing';
import {
  AISession,
  BlueprintMachine,
  BlueprintParser,
  createExaTool,
  createGraphWriterTool,
  createLocalSearchTool,
  researchFn,
  setConsolePrinter,
  type BlueprintDefinition,
} from '@dxos/assistant';
import { ComputeGraphModel, type GptOutput, NODE_INPUT, NODE_OUTPUT, ValueBag } from '@dxos/conductor';
import { TestRuntime } from '@dxos/conductor/testing';
import { Obj } from '@dxos/echo';
import { type EchoDatabase, type QueueFactory } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import {
  AiService,
  ConfiguredCredentialsService,
  FunctionExecutor,
  ServiceContainer,
  TracingService,
} from '@dxos/functions';
import { log } from '@dxos/log';
import { DataType, DataTypes } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

const REMOTE_AI = true;
const MOCK_SEARCH = false;

describe.runIf(process.env.DX_RUN_SLOW_TESTS === '1')('experimental', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;
  let queues: QueueFactory;
  let serviceContainer: ServiceContainer;

  beforeAll(async () => {
    // TODO(dmaretskyi): Helper to scaffold this from a config.
    builder = await new EchoTestBuilder().open();

    ({ db, queues } = await builder.createDatabase({ indexing: { vector: true } }));
    db.graph.schemaRegistry.addSchema(DataTypes);

    serviceContainer = new ServiceContainer().setServices({
      ai: {
        client: REMOTE_AI
          ? new EdgeAiServiceClient({
              endpoint: AI_SERVICE_ENDPOINT.REMOTE,
              defaultGenerationOptions: {
                // model: '@anthropic/claude-sonnet-4-20250514',
                model: '@anthropic/claude-3-5-sonnet-20241022',
              },
            })
          : new OllamaAiServiceClient({
              overrides: {
                model: 'llama3.1:8b',
              },
            }),
      },
      credentials: new ConfiguredCredentialsService([{ service: 'exa.ai', apiKey: EXA_API_KEY }]),
      database: { db },
      tracing: TracingService.console,
    });
  });

  test('blueprint', { timeout: 120_000 }, async () => {
    // TODO(dmaretskyi): Store in ECHO.
    const blueprintDefinition: BlueprintDefinition = {
      steps: [
        {
          instructions: 'Research information and entities related to the selected objects.',
          tools: ['search/web_search'],
        },
        {
          instructions:
            'Based on your research find matching entires that are already in the graph. Do exaustive research.',
          tools: ['search/local_search'],
        },
        {
          instructions: 'Add researched data to the graph. Make connections to existing objects.',
          tools: ['search/local_search', 'graph/writer'],
        },
      ],
    };

    const blueprint = BlueprintParser.create().parse(blueprintDefinition);

    const researchQueue = queues.create();
    const tools = new ToolRegistry(
      [
        createExaTool({ apiKey: EXA_API_KEY }),
        createLocalSearchTool(db, researchQueue),
        createGraphWriterTool({
          db,
          queue: researchQueue,
          schema: DataTypes,
          onDone: async (objects) => {
            await researchQueue.append(objects);
          },
        }),
      ].filter(isNonNullable),
    );

    const company = db.add(
      Obj.make(DataType.Organization, {
        name: 'Notion',
        website: 'https://www.notion.com',
      }),
    );
    await db.flush({ indexes: true });

    const machine = new BlueprintMachine(tools, blueprint);
    const { client } = serviceContainer.getService(AiService);
    setConsolePrinter(machine, true);
    await machine.runToCompletion({ aiClient: client, input: [company] });

    log.info('researched', {
      objects: await researchQueue.queryObjects(),
    });
  });

  test('circuit', { timeout: 120_000 }, async () => {
    // TODO(dmaretskyi): Can we type graph inputs/outputs?
    // TODO(dmaretskyi): Store in ECHO.
    const gptCircuit = () => {
      const model = ComputeGraphModel.create();
      model.builder
        .createNode({ id: 'gpt1-INPUT', type: NODE_INPUT })
        .createNode({ id: 'gpt1-GPT', type: 'gpt' })
        .createNode({ id: 'gpt1-OUTPUT', type: NODE_OUTPUT })
        .createEdge({ node: 'gpt1-INPUT', property: 'prompt' }, { node: 'gpt1-GPT', property: 'prompt' })
        .createEdge({ node: 'gpt1-GPT', property: 'text' }, { node: 'gpt1-OUTPUT', property: 'text' });

      return model;
    };

    const runtime = new TestRuntime(serviceContainer);
    runtime.registerGraph('dxn:compute:gpt1', gptCircuit());

    const { text } = await runtime
      .runGraph<GptOutput>('dxn:compute:gpt1', ValueBag.make({ prompt: 'What is the meaning of life?' }))
      .pipe(Effect.flatMap(ValueBag.unwrap), Effect.scoped, Effect.runPromise);

    log.info('text', { text });
  });

  test('conversation', { timeout: 120_000 }, async () => {
    const { client } = serviceContainer.getService(AiService);
    const session = new AISession({
      operationModel: 'configured',
    });

    // TODO(dmaretskyi): Use tool registry.
    const sage = createTool('test', {
      name: 'sage',
      description: 'Can say what the meaning of life is.',
      schema: Schema.Struct({
        question: Schema.String,
      }),
      execute: async (params) => {
        return ToolResult.Success('The meaning of life is your own to decide.');
      },
    });

    const result = await session.run({
      client,
      history: [],
      prompt: 'What is the meaning of life?',
      tools: [sage],
      artifacts: [],
    });

    log.info('result', { result });
  });

  test('function', { timeout: 120_000 }, async () => {
    db.add(
      Obj.make(DataType.Organization, {
        name: 'Notion',
        website: 'https://www.notion.com',
      }),
    );
    await db.flush({ indexes: true });

    const executor = new FunctionExecutor(serviceContainer);
    const result = await executor.invoke(researchFn, {
      query: 'Who are the founders of Notion?',
      mockSearch: MOCK_SEARCH,
    });

    console.log(inspect(result, { depth: null, colors: true }));
    console.log(JSON.stringify(result, null, 2));
  });
});

//
// Copyright 2025 DXOS.org
//

import { Effect, pipe, Schema } from 'effect';
import { inspect } from 'node:util';
import { beforeAll, describe, test } from 'vitest';

import { createTool, ToolRegistry, ToolResult } from '@dxos/ai';
import { EXA_API_KEY } from '@dxos/ai/testing';
import {
  AISession,
  BlueprintMachine,
  BlueprintParser,
  createExaTool,
  createGraphWriterTool,
  createLocalSearchTool,
  researchFn,
  setConsolePrinter,
} from '@dxos/assistant';
import {
  NODE_INPUT,
  NODE_OUTPUT,
  ComputeGraphModel,
  type GptOutput,
  ValueBag,
  computeGraphToGraphViz,
  DEFAULT_INPUT,
} from '@dxos/conductor';
import { TestRuntime } from '@dxos/conductor/testing';
import { Obj } from '@dxos/echo';
import { type EchoDatabase, type QueueFactory } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { runAndForwardErrors } from '@dxos/effect';
import {
  AiService,
  FunctionExecutor,
  type ServiceContainer,
  ToolResolverService,
  TracingService,
} from '@dxos/functions';
import { createTestServices } from '@dxos/functions/testing';
import { log } from '@dxos/log';
import { DataType, DataTypes } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { compileBlueprint } from './blueprint-compiler';

const REMOTE_AI = true;
const MOCK_SEARCH = false;

// Priority: Unify all compute functionality using ComputeGraph (which is the most powerful tool).
// - Demonstrate simple Blueprint-like functionality via ComputeGraph (i.e., research demo).
// - Retire Blueprint StateMachine and create Simple Blueprint sugar for StateMachine.
// - Implement conversation via ComputeGraph.
// Cleanup:
// - Unify observability (consider effect tracing).
// - Normalize Tool API and ToolRegistry. (consider effect AiToolkit)
// - Normalize AiServiceClient (consider effect AiLanguageModel)

describe.runIf(process.env.DX_RUN_SLOW_TESTS === '1')('experimental', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;
  let queues: QueueFactory;
  let serviceContainer: ServiceContainer;

  beforeAll(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db, queues } = await builder.createDatabase({ indexing: { vector: true }, types: DataTypes }));

    // TODO(dmaretskyi): Helper to scaffold this from a config.
    serviceContainer = createTestServices({
      ai: {
        provider: REMOTE_AI ? 'edge' : 'ollama',
      },
      credentials: {
        services: [
          {
            service: 'exa.ai',
            apiKey: EXA_API_KEY,
          },
        ],
      },
      db,
      logging: {
        enabled: true,
      },
      queues,
      tracing: {
        service: TracingService.console,
      },
      // TODO(burdon): Provide Toolkit.
      toolResolver: ToolResolverService.make(new ToolRegistry([printerTool, calculatorTool])),
    });
  });

  test('compute graph', { timeout: 120_000 }, async () => {
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

  test('blueprint', { timeout: 120_000 }, async () => {
    const researchQueue = queues.create();
    const toolkit = new ToolRegistry(
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

    // TODO(dmaretskyi): Store in ECHO.
    const org = db.add(Obj.make(DataType.Organization, { name: 'Notion', website: 'https://www.notion.com' }));
    await db.flush({ indexes: true });

    const machine = new BlueprintMachine(toolkit, RESEARCH_BLUEPRINT);
    const { client } = serviceContainer.getService(AiService);
    setConsolePrinter(machine, true);
    console.log(client);

    await machine.runToCompletion({ aiClient: client, input: [org] });
    log.info('researched', { objects: await researchQueue.queryObjects() });
  });

  test('blueprint (compiled)', { timeout: 120_000 }, async () => {
    const graph = await compileBlueprint(CALCULATOR_BLUEPRINT);
    console.log(computeGraphToGraphViz(graph));
    const runtime = new TestRuntime(serviceContainer);
    runtime.registerGraph('dxn:compute:test', new ComputeGraphModel(graph));

    // const org = Obj.make(DataType.Organization, { name: 'Notion', website: 'https://www.notion.com' });
    const { text } = await pipe(
      { [DEFAULT_INPUT]: '2 + 2 * 2' },
      ValueBag.make,
      (input) => runtime.runGraph<GptOutput>('dxn:compute:test', input),
      Effect.flatMap(ValueBag.unwrap),
      Effect.scoped,
      runAndForwardErrors,
    );

    console.log(text);
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
    db.add(Obj.make(DataType.Organization, { name: 'Notion', website: 'https://www.notion.com' }));
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

const RESEARCH_BLUEPRINT = BlueprintParser.create().parse({
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
});

const CALCULATOR_BLUEPRINT = BlueprintParser.create().parse({
  steps: [
    {
      instructions: 'Use the calculator tool to calculate the expression provided.',
      tools: ['test/calculator'],
    },
    {
      instructions: 'Use the printer tool to print the result of the computation.',
      tools: ['test/printer'],
    },
  ],
});

const calculatorTool = createTool('test', {
  name: 'calculator',
  description: 'Can calculate the result of an expression.',
  schema: Schema.Struct({
    a: Schema.Number.annotations({ description: 'The first number.' }),
    b: Schema.Number.annotations({ description: 'The second number.' }),
    op: Schema.Literal('+', '-', '*', '/').annotations({ description: 'The operation to perform.' }),
  }),
  execute: async (params) => {
    switch (params.op) {
      case '+':
        return ToolResult.Success({ result: params.a + params.b });
      case '-':
        return ToolResult.Success({ result: params.a - params.b });
      case '*':
        return ToolResult.Success({ result: params.a * params.b });
      case '/':
        return ToolResult.Success({ result: params.a / params.b });
      default:
        return ToolResult.Error('Invalid operation.');
    }
  },
});

const printerTool = createTool('test', {
  name: 'printer',
  description: 'Can print a message.',
  schema: Schema.Struct({
    message: Schema.String.annotations({ description: 'The message to print.' }),
  }),
  execute: async (params) => {
    console.log(`## MESSAGE: ${params.message}`);
    return ToolResult.Success('Data printed.');
  },
});

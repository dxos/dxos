//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Runtime from 'effect/Runtime';
import * as Schema from 'effect/Schema';

import { AiService, DEFAULT_EDGE_MODEL, type ToolExecutionService, type ToolResolverService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import {
  AiConversation,
  type AiConversationRunParams,
  makeToolExecutionServiceFromFunctions,
  makeToolResolverFromFunctions,
} from '@dxos/assistant';
import { Client, Config } from '@dxos/client';
import { Context } from '@dxos/context';
import { type Database } from '@dxos/echo';
import { throwCause } from '@dxos/effect';
import { CredentialsService, type FunctionInvocationService, type QueueService, TracingService } from '@dxos/functions';
import { FunctionInvocationServiceLayerTestMocked, TestDatabaseLayer } from '@dxos/functions-runtime/testing';
import { invariant } from '@dxos/invariant';
import { type Message } from '@dxos/types';

// TODO(burdon): Factor out (see plugin-assistant/processor.ts)
export type AiChatServices =
  | CredentialsService
  | Database.Service
  | QueueService
  | FunctionInvocationService
  | AiService.AiService
  | ToolExecutionService
  | ToolResolverService
  | TracingService;

const TestToolkit = Toolkit.make(
  Tool.make('random', {
    description: 'Random number generator',
    parameters: {},
    success: Schema.Number,
  }),
);

// TODO(burdon): Create minimal toolkit.
const toolkit = Toolkit.merge(TestToolkit) as Toolkit.Toolkit<any>;

const TestServicesLayer = Layer.mergeAll(
  TracingService.layerNoop,
  AiServiceTestingPreset('direct'),
  TestDatabaseLayer({}),
  FunctionInvocationServiceLayerTestMocked({
    functions: [],
  }).pipe(Layer.provideMerge(TracingService.layerNoop)),
);

export const TestLayer: Layer.Layer<AiChatServices, never, never> = Layer.mergeAll(
  AiService.model('@anthropic/claude-opus-4-0'),
  makeToolResolverFromFunctions([], toolkit),
  makeToolExecutionServiceFromFunctions(toolkit, toolkit.toLayer({}) as any),
  CredentialsService.layerFromDatabase(),
).pipe(Layer.provideMerge(TestServicesLayer), Layer.orDie);

/**
 * CLI internal state.
 */
export class Core extends Context {
  private readonly _ctx = new Context();

  private _client?: Client;
  private _conversation?: AiConversation;

  constructor(private _services: Runtime.Runtime<AiChatServices>) {
    super();
  }

  get client(): Client | undefined {
    return this._client;
  }

  async open(): Promise<void> {
    const config = new Config();
    this._client = new Client({ config });
    await this._client.initialize();
    const identity = this._client.halo.identity.get();
    if (!identity?.identityKey) {
      await this._client.halo.createIdentity();
    }

    await this._client.spaces.waitUntilReady();
    const space = this._client.spaces.default;
    const queue = space.queues.create<Message.Message>();
    this._conversation = new AiConversation(queue);
  }

  async close(): Promise<void> {
    await this._conversation?.close();
    await this._client?.destroy();
    await this._ctx.dispose();
    this._conversation = undefined;
    this._client = undefined;
  }

  async request(params: AiConversationRunParams) {
    invariant(this._conversation);
    const request = this._conversation.createRequest(params);
    const fiber = request.pipe(
      Effect.provide(AiService.model(DEFAULT_EDGE_MODEL)),
      Effect.asVoid,
      Runtime.runFork(this._services),
    );

    const response = await fiber.pipe(Fiber.join, Effect.runPromiseExit);
    if (!Exit.isSuccess(response) && !Cause.isInterruptedOnly(response.cause)) {
      throwCause(response.cause);
    }

    console.log(response);
  }
}

//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as AiError from 'effect/ai/AiError';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import { test } from 'vitest';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { AiModelNotAvailableError } from '@dxos/ai';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import { AiSession } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import { Database, Feed } from '@dxos/echo';
import { UsageQuotaExceededError } from '@dxos/edge-client';
import * as EffectEx from '@dxos/effect/EffectEx';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN } from '@dxos/keys';
import { Message } from '@dxos/types';

import { AiUsageQuotaError, ChatModel, parseError } from './chat-model.ts';
import { type ThreadProjection } from './thread.ts';

const TestLayer = AssistantTestLayer({ tracing: 'noop', types: [Chat.Chat, Feed.Feed, Message.Message] });

describe('ChatModel', () => {
  it.effect(
    'basic',
    Effect.fn(
      function* ({ expect }) {
        const feed = Feed.make();
        yield* Database.add(feed);
        const runtime = yield* Effect.context<Database.Service>();
        const session = yield* EffectEx.acquireReleaseResource(() => new AiSession.Session({ feed, runtime }));
        const managedRuntime = ManagedRuntime.make(Layer.empty) as unknown as Capabilities.ProcessManagerRuntime;
        const registry = AtomRegistry.make();
        const chatModel = new ChatModel(session, managedRuntime, feed, Layer.empty as any, {
          observableRegistry: registry,
        });
        expect(chatModel).toBeDefined();
        expect(chatModel.active).toBeDefined();

        // The thread is the chat model's one view: a feed append and a sent prompt both arrive through it.
        const rows = (predicate: (thread: ThreadProjection) => boolean) =>
          Effect.promise(
            () =>
              new Promise<ThreadProjection>((resolve) => {
                const unsubscribe = registry.subscribe(
                  chatModel.thread,
                  (thread) => {
                    if (predicate(thread)) {
                      queueMicrotask(() => unsubscribe());
                      resolve(thread);
                    }
                  },
                  { immediate: true },
                );
              }),
          );

        yield* Feed.append(feed, [
          Message.make({ sender: { role: 'assistant' }, blocks: [{ _tag: 'text', text: 'hi' }] }),
        ]);
        const appended = yield* rows((thread) => thread.messages.length === 1);
        expect(appended.tail).toBe(0);

        const id = chatModel.send({ message: 'hello' });
        const sent = registry.get(chatModel.thread);
        expect(sent.messages.map((message) => message.id)).toEqual([appended.messages[0].id, id]);
        expect(sent.delivery.get(id)?.outboxId).toBe(id);
        expect(sent.tail).toBe(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

describe('parseError', () => {
  const QUOTA_MESSAGE = 'You have reached your AI usage limit for this period.';

  // The agent runs in a separate process; on failure the cause is rendered to a string via
  // `Cause.pretty` (which drops nested causes) before it reaches parseError. EDGE rejects an
  // over-quota request with 429, whose message embeds the status — this is the exact string the
  // chat receives.
  test('detects an EDGE 429 in the pretty-printed process failure (string)', ({ expect }) => {
    const err =
      'HttpResponseError: StatusCode: An HTTP response error occurred. (429 POST http://edge.internal/v1/messages)\nResponse Body: {"error":{"message":"You have exceeded your usage quota."}}';
    const result = parseError(err);
    expect(result.message).toBe(QUOTA_MESSAGE);
    // Tagged so the chat toast can offer a usage-dashboard link for this case only.
    expect(result).toBeInstanceOf(AiUsageQuotaError);
  });

  test('detects a typed quota rejection by reason (direct path)', ({ expect }) => {
    const err = new AiError.AiError({
      module: 'AnthropicClient',
      method: 'streamText',
      reason: new AiError.QuotaExhaustedError({
        http: {
          request: { method: 'POST', url: 'http://edge.internal/v1/messages', urlParams: [], headers: {} },
          response: { status: 429, headers: {} },
          body: JSON.stringify({ error: { message: 'You have exceeded your usage quota.' } }),
        },
      }),
    });
    expect(parseError(err).message).toBe(QUOTA_MESSAGE);
  });

  test('surfaces a live UsageQuotaExceededError message from the cause chain (direct path)', ({ expect }) => {
    const err = new Error('request failed', {
      cause: new UsageQuotaExceededError({ message: 'You have exceeded your usage quota.' }),
    });
    expect(parseError(err).message).toBe('You have exceeded your usage quota.');
  });

  test('preserves the original error as the cause', ({ expect }) => {
    const err = 'HttpResponseError: StatusCode: ... (429 POST http://edge.internal/v1/messages)';
    expect(parseError(err).cause).toBe(err);
  });

  test('still surfaces the unavailable model from a string', ({ expect }) => {
    const err = "UnknownError: ChatCompletionsClient.streamText: model 'gemma3:27b' not found";
    expect(parseError(err).message).toBe('The model is not available: gemma3:27b');
  });

  // Raised by the model resolver chain before the request leaves the browser, so the user sees it
  // whenever the configured model is not served by the configured provider.
  test('names the model of a typed AiModelNotAvailableError (direct path)', ({ expect }) => {
    const err = new AiModelNotAvailableError(DXN.make('com.anthropic.model.claude-opus-4-8.default'));
    expect(parseError(err).message).toBe('The model is not available: dxn:com.anthropic.model.claude-opus-4-8.default');
  });

  test('names the model of an AiModelNotAvailableError nested in the cause chain', ({ expect }) => {
    const err = new Error('request failed', {
      cause: new AiModelNotAvailableError(DXN.make('com.anthropic.model.claude-opus-4-8.default')),
    });
    expect(parseError(err).message).toBe('The model is not available: dxn:com.anthropic.model.claude-opus-4-8.default');
  });

  // The stringified form appends the error's context, so the model is not the end of the string —
  // the trailing separator must not be captured as part of the model id.
  test('names the model once the failure has been stringified by the process boundary', ({ expect }) => {
    const err =
      'AiModelNotAvailableError: AI Model not available: dxn:com.anthropic.model.claude-opus-4-8.default: {"model":"dxn:com.anthropic.model.claude-opus-4-8.default"}';
    expect(parseError(err).message).toBe('The model is not available: dxn:com.anthropic.model.claude-opus-4-8.default');
  });

  test('passes through a non-quota AiError description', ({ expect }) => {
    const err = new AiError.AiError({
      module: 'ChatCompletionsClient',
      method: 'streamText',
      reason: new AiError.UnknownError({ description: 'Connection refused' }),
    });
    expect(parseError(err).message).toBe('Connection refused');
  });

  // A provider failure inside the agent process reaches the chat as the process's stringified failure,
  // so its typed reason is gone but the provider's own description is still in the text.
  test('passes through the detail of an AiError stringified by the process boundary', ({ expect }) => {
    const err = new Error('Process failed', {
      cause:
        'effect/ai/AiError/AiError: AnthropicClient.streamText: Invalid request. prompt is too long\n    at stack (file.ts:1:1)',
    });
    expect(parseError(err).message).toBe('Invalid request. prompt is too long');
  });

  test('falls back to a generic message for unrecognized errors', ({ expect }) => {
    expect(parseError('something unexpected blew up').message).toBe('An unexpected error occurred.');
    expect(parseError(new Error('boom')).message).toBe('An unexpected error occurred.');
  });
});

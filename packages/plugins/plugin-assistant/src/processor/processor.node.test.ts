//
// Copyright 2025 DXOS.org
//

import * as AiError from '@effect/ai/AiError';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Option from 'effect/Option';
import { test } from 'vitest';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { Capabilities } from '@dxos/app-framework';
import { AiSession } from '@dxos/assistant';
import { Chat } from '@dxos/assistant-toolkit';
import { Database, Feed } from '@dxos/echo';
import { UsageQuotaExceededError } from '@dxos/edge-client';
import { EffectEx } from '@dxos/effect';
import { TestHelpers } from '@dxos/effect/testing';

import { AiChatProcessor, AiUsageQuotaError, parseError } from './processor';

const TestLayer = AssistantTestLayer({ tracing: 'noop', types: [Chat.Chat, Feed.Feed] });

describe('Chat processor', () => {
  it.scoped(
    'basic',
    Effect.fn(
      function* ({ expect }) {
        const feed = Feed.make();
        yield* Database.add(feed);
        const runtime = yield* Effect.runtime<Database.Service>();
        const session = yield* EffectEx.acquireReleaseResource(() => new AiSession.Session({ feed, runtime }));
        const managedRuntime = ManagedRuntime.make(Layer.empty) as unknown as Capabilities.ProcessManagerRuntime;
        const processor = new AiChatProcessor(session, managedRuntime, feed, Layer.empty as any);
        expect(processor).toBeDefined();
        expect(processor.active).toBeDefined();
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
  // over-quota request with 429, which `@effect/ai` surfaces as an HttpResponseError whose message
  // embeds the status — this is the exact string the chat receives.
  test('detects an EDGE 429 in the pretty-printed process failure (string)', ({ expect }) => {
    const err =
      'HttpResponseError: StatusCode: An HTTP response error occurred. (429 POST http://edge.internal/v1/messages)\nResponse Body: {"error":{"message":"You have exceeded your usage quota."}}';
    const result = parseError(err);
    expect(result.message).toBe(QUOTA_MESSAGE);
    // Tagged so the chat toast can offer a usage-dashboard link for this case only.
    expect(result).toBeInstanceOf(AiUsageQuotaError);
  });

  test('detects a typed 429 HttpResponseError by status (direct path)', ({ expect }) => {
    const err = new AiError.HttpResponseError({
      module: 'AnthropicClient',
      method: 'streamText',
      reason: 'StatusCode',
      request: {
        method: 'POST',
        url: 'http://edge.internal/v1/messages',
        urlParams: [],
        hash: Option.none(),
        headers: {},
      },
      response: { status: 429, headers: {} },
      body: JSON.stringify({ error: { message: 'You have exceeded your usage quota.' } }),
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

  test('passes through a non-quota AiError description', ({ expect }) => {
    const err = new AiError.UnknownError({
      module: 'ChatCompletionsClient',
      method: 'streamText',
      description: 'Connection refused',
    });
    expect(parseError(err).message).toBe('Connection refused');
  });

  test('falls back to a generic message for unrecognized errors', ({ expect }) => {
    expect(parseError('something unexpected blew up').message).toBe('An unexpected error occurred.');
    expect(parseError(new Error('boom')).message).toBe('An unexpected error occurred.');
  });
});

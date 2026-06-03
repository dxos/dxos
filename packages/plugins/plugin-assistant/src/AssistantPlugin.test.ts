//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { AiService } from '@dxos/ai';
import { TestAiService } from '@dxos/ai/testing';
import { AgentPrompt } from '@dxos/assistant-toolkit';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Operation, Routine, ServiceResolver } from '@dxos/compute';
import { Database, Feed, Ref } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
import { TestContextService } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { AutomationPlugin } from '@dxos/plugin-automation/plugin';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { AssistantPlugin } from '#plugin';

import { LanguageModel } from '@effect/ai';
import { type TestContext } from '@effect/vitest';
import { Layer, Schema } from 'effect';

import { meta } from './meta';

EntityId.dangerouslyDisableRandomness();

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('AssistantPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), AssistantPlugin()],
    });

    // After autoStart: AppGraphBuilder, CreateObject, schema, OperationHandler all auto-cascade.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('AppGraphBuilder'), moduleId('CreateObject'), moduleId('schema')]),
    );

    // AssistantPlugin fires SetupArtifactDefinition itself, so it can test its own blueprint.
    await harness.fire(AppActivationEvents.SetupArtifactDefinition);
    expect(harness.manager.getActive()).toContain(moduleId('BlueprintDefinition'));

    // OperationHandler auto-cascades from ProcessManagerPlugin.
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));

    // AiService module must activate on SetupProcessManager (before the process manager is built).
    expect(harness.manager.getActive()).toContain(moduleId('AiService'));

    // AiService must be resolvable via the process manager's ServiceResolver.
    await harness.runPromise(
      Effect.gen(function* () {
        const aiService = yield* AiService.AiService;
        expect(aiService).toBeDefined();
      }).pipe(Effect.provide(ServiceResolver.provide({}, AiService.AiService))),
    );
  });

  test('can memoize ai-service requests', async (ctx) => {
    const { expect } = ctx;
    await using harness = await createComposerTestApp({
      plugins: [
        ClientPlugin({}),
        AssistantPlugin({
          aiServiceMiddleware: await makeMemoizedAiServiceMiddleware(ctx),
        }),
      ],
    });

    await harness.runPromise(
      Effect.gen(function* () {
        const { text } = yield* LanguageModel.generateText({
          prompt: 'What is the capital of France?',
        });
        expect(text.toLocaleLowerCase()).toContain('paris');
      }).pipe(
        Effect.provide(
          AiService.model('@anthropic/claude-haiku-4-5').pipe(
            Layer.provideMerge(ServiceResolver.provide({}, AiService.AiService)),
          ),
        ),
      ),
    );
  });

  test('can run memoized routine', { timeout: 120_000 }, async (ctx) => {
    const { expect } = ctx;
    await using harness = await createComposerTestApp({
      plugins: [
        ClientPlugin({}),
        AssistantPlugin({
          aiServiceMiddleware: await makeMemoizedAiServiceMiddleware(ctx),
        }),
        AutomationPlugin(),
      ],
    });

    await harness.fire(AppActivationEvents.SetupArtifactDefinition);

    const { personalSpace } = await runAndForwardErrors(initializeIdentity(harness.get(ClientCapabilities.Client)));

    await harness.runPromise(
      Effect.gen(function* () {
        const routine = yield* Database.add(
          Routine.make({
            name: 'capital-test',
            instructions:
              'Call completeJob with success set to a JSON object { "capital": "<lowercase country capital>" } for the country in input.',
            input: Schema.Struct({
              country: Schema.String,
            }),
            output: Schema.Struct({
              capital: Schema.String,
            }),
          }),
        );
        yield* Database.flush();

        const result = yield* Operation.invoke(
          AgentPrompt,
          {
            prompt: Ref.make(routine),
            input: {
              country: 'France',
            },
            model: '@anthropic/claude-haiku-4-5',
          },
          { spaceId: personalSpace.id },
        );
        expect(result).toEqual({ capital: 'paris' });
      }).pipe(Effect.provide(ServiceResolver.provide({ space: personalSpace.id }, Database.Service, Feed.FeedService))),
    );
  });
});

const makeMemoizedAiServiceMiddleware = (
  ctx: TestContext,
): Promise<(_upstream: AiService.Service) => AiService.Service> =>
  AiService.AiService.pipe(
    Effect.provide(
      TestAiService({ preset: 'direct' }).pipe(Layer.provideMerge(Layer.succeed(TestContextService, ctx))),
    ),
    // Ignoring actual AI service the plugin contructs and using our own.
    Effect.map((service) => (_upstream: AiService.Service) => service),
    Effect.runPromise,
  );

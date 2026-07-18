//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import { type TestContext } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { AgentService as AgentServiceRuntime } from '@dxos/agent-runtime';
import { AiService } from '@dxos/ai';
import { TestAiService } from '@dxos/ai/testing';
import { AgentWizardSkill, DatabaseSkill, RunInstructions, SkillManagerSkill } from '@dxos/assistant-toolkit';
import { AgentService, Instructions, Operation, ServiceResolver, Skill } from '@dxos/compute';
import { Database, Ref, Registry } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { TestContextService } from '@dxos/effect/testing';
import { DXN, EntityId } from '@dxos/keys';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { RoutinePlugin } from '@dxos/plugin-routine/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { AssistantPlugin } from '#plugin';

import { meta } from './meta';
import { AssistantSkill } from './skills/assistant';

EntityId.dangerouslyDisableRandomness();

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('AssistantPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), AssistantPlugin()],
    });

    // All dependency-mode roots, so they all activate immediately during the startup dependency pass.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([
        moduleId('AppGraphBuilder'),
        moduleId('CreateObject'),
        moduleId('schema'),
        moduleId('SkillDefinition'),
        moduleId('OperationHandler'),
        moduleId('AiService'),
        moduleId('AiContext'),
        moduleId('AgentRuntime'),
      ]),
    );

    // Space-affinity LayerSpec — resolution requires a space context.
    const { personalSpace } = await EffectEx.runAndForwardErrors(
      initializeIdentity(harness.get(ClientCapabilities.Client)),
    );
    await harness.runPromise(
      Effect.gen(function* () {
        const aiService = yield* AiService.AiService;
        expect(aiService).toBeDefined();
      }).pipe(Effect.provide(ServiceResolver.provide({ space: personalSpace.id }, AiService.AiService))),
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

    const { personalSpace } = await EffectEx.runAndForwardErrors(
      initializeIdentity(harness.get(ClientCapabilities.Client)),
    );
    await harness.runPromise(
      Effect.gen(function* () {
        const { text } = yield* LanguageModel.generateText({
          prompt: 'What is the capital of France?',
        });
        expect(text.toLocaleLowerCase()).toContain('paris');
      }).pipe(
        Effect.provide(
          AiService.model('com.anthropic.model.claude-haiku-4-5.default').pipe(
            Layer.provideMerge(ServiceResolver.provide({ space: personalSpace.id }, AiService.AiService)),
          ),
        ),
      ),
    );
  });

  test('can run memoized instructions', { timeout: 120_000 }, async (ctx) => {
    const { expect } = ctx;
    await using harness = await createComposerTestApp({
      plugins: [
        ClientPlugin({}),
        AssistantPlugin({
          aiServiceMiddleware: await makeMemoizedAiServiceMiddleware(ctx),
        }),
        RoutinePlugin(),
      ],
    });

    const { personalSpace } = await EffectEx.runAndForwardErrors(
      initializeIdentity(harness.get(ClientCapabilities.Client)),
    );

    await harness.runPromise(
      Effect.gen(function* () {
        const instructions = yield* Database.add(
          Instructions.make({
            name: 'capital-test',
            text: 'Call completeJob with success set to a JSON object { "capital": "<lowercase country capital>" } for the country in input.',
          }),
        );
        yield* Database.flush();

        const result = yield* Operation.invoke(
          RunInstructions,
          {
            instructions: Ref.make(instructions),
            input: {
              country: 'France',
            },
            model: DXN.make('com.anthropic.model.claude-haiku-4-5.default'),
          },
          { spaceId: personalSpace.id },
        );
        expect(result).toEqual({ capital: 'paris' });
      }).pipe(Effect.provide(ServiceResolver.provide({ space: personalSpace.id }, Database.Service))),
    );
  });

  test('smoke test for agent service with standard skills', { timeout: 120_000 }, async (ctx) => {
    const { expect } = ctx;
    await using harness = await createComposerTestApp({
      plugins: [
        ClientPlugin({}),
        AssistantPlugin({
          aiServiceMiddleware: await makeMemoizedAiServiceMiddleware(ctx),
        }),
        RoutinePlugin(),
      ],
    });

    const { personalSpace } = await initializeIdentity(harness.get(ClientCapabilities.Client)).pipe(
      EffectEx.runAndForwardErrors,
    );

    await harness.runPromise(
      Effect.gen(function* () {
        const skills = yield* Effect.forEach(
          [DatabaseSkill, AssistantSkill, SkillManagerSkill, AgentWizardSkill],
          (_) => Skill.resolve(_.key),
        );

        const agent = yield* AgentServiceRuntime.createSession({
          skills,
        });
        yield* agent.submitPrompt('Hello');
        yield* agent.waitForCompletion();
      }).pipe(
        Effect.provide(
          ServiceResolver.provide(
            { space: personalSpace.id },
            Database.Service,
            AgentService.AgentService,
            Registry.Service,
          ),
        ),
      ),
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

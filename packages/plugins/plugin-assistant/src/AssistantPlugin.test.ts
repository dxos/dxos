//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { AgentService as AgentServiceRuntime } from '@dxos/agent-runtime';
import { AiService } from '@dxos/ai';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { AgentWizardSkill, DatabaseSkill, RunInstructions, SkillManagerSkill } from '@dxos/assistant-toolkit';
import { AgentService, Instructions, Operation, ServiceResolver, Skill } from '@dxos/compute';
import { Database, Ref, Registry } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
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

// Memoized-replay cases (frozen A/B); gated off the default `:test` path. The module-activation
// boot test below carries the real composition signal and always runs.

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

  test('resolves a language model through the plugin AI service', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [
        ClientPlugin({}),
        AssistantPlugin({
          aiServiceMiddleware: ScriptedLanguageModel.scriptedAiServiceMiddleware([
            { parts: [ScriptedLanguageModel.text('Paris is the capital of France.')] },
          ]),
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

  test('runs instructions end to end through the plugin', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [
        ClientPlugin({}),
        AssistantPlugin({
          aiServiceMiddleware: ScriptedLanguageModel.scriptedAiServiceMiddleware([
            { parts: [ScriptedLanguageModel.toolCall('completeJob', { success: { capital: 'paris' } })] },
            { parts: [ScriptedLanguageModel.text('Done.')] },
          ]),
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

  test(
    'boots the agent service with the standard skills and completes a turn',
    { timeout: 120_000 },
    async ({ expect }) => {
      await using harness = await createComposerTestApp({
        plugins: [
          ClientPlugin({}),
          AssistantPlugin({
            aiServiceMiddleware: ScriptedLanguageModel.scriptedAiServiceMiddleware([
              { parts: [ScriptedLanguageModel.text('Hello back.')] },
            ]),
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
          expect(skills).toHaveLength(4);

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
    },
  );
});

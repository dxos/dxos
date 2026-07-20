//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { AgentService as AgentServiceRuntime } from '@dxos/agent-runtime';
import { AiService } from '@dxos/ai';
import { ScriptedAiService } from '@dxos/ai/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { AgentWizardSkill, DatabaseSkill, RunInstructions, SkillManagerSkill } from '@dxos/assistant-toolkit';
import { AgentService, Instructions, Operation, ServiceResolver, Skill } from '@dxos/compute';
import { Database, Ref, Registry } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { RoutinePlugin } from '@dxos/plugin-routine/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { AssistantPlugin } from '#plugin';

import { meta } from './meta';
import { AssistantSkill } from './skills/assistant';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('AssistantPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), AssistantPlugin()],
    });

    // After autoStart: AppGraphBuilder, CreateObject, schema, OperationHandler all auto-cascade.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('AppGraphBuilder'), moduleId('CreateObject'), moduleId('schema')]),
    );

    // AssistantPlugin fires SetupArtifactDefinition itself, so it can test its own skill.
    await harness.fire(AppActivationEvents.SetupArtifactDefinition);
    expect(harness.manager.getActive()).toContain(moduleId('SkillDefinition'));

    // OperationHandler auto-cascades from ProcessManagerPlugin.
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));

    // Process-manager layer specs must activate on SetupProcessManager.
    expect(harness.manager.getActive()).toContain(moduleId('AiService'));
    expect(harness.manager.getActive()).toContain(moduleId('AiContext'));
    expect(harness.manager.getActive()).toContain(moduleId('AgentRuntime'));

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

  test('can override ai-service requests via aiServiceMiddleware', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [
        ClientPlugin({}),
        AssistantPlugin({
          // A non-streaming `generateText` call, so the response is scripted under the model's
          // `generate` bucket rather than the (streaming-only) top-level `turns`.
          aiServiceMiddleware: () =>
            ScriptedAiService.make({
              models: {
                'claude-haiku-4-5': {
                  generate: [ScriptedAiService.text('The capital of France is Paris.')],
                },
              },
            }),
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

  test('can run instructions through the plugin', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [
        ClientPlugin({}),
        AssistantPlugin({
          // The agent calls the inline `completeJob` tool with the output, then produces a final
          // text turn so the agent loop terminates.
          aiServiceMiddleware: () =>
            ScriptedAiService.make([
              ScriptedAiService.toolCall('completeJob', { success: { capital: 'paris' } }),
              ScriptedAiService.text('Done.'),
            ]),
        }),
        RoutinePlugin(),
      ],
    });

    await harness.fire(AppActivationEvents.SetupArtifactDefinition);

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

  test('smoke test for agent service with standard skills', async () => {
    await using harness = await createComposerTestApp({
      plugins: [
        ClientPlugin({}),
        AssistantPlugin({
          // No tools needed — the prompt is purely conversational.
          aiServiceMiddleware: () => ScriptedAiService.make([ScriptedAiService.text('Hi! How can I help you?')]),
        }),
        RoutinePlugin(),
      ],
    });

    await harness.fire(AppActivationEvents.SetupArtifactDefinition);

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

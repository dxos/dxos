//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';
import { describe, test } from 'vitest';

import { AgentService as AgentServiceRuntime } from '@dxos/agent-runtime';
import { AiService } from '@dxos/ai';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { AiContext } from '@dxos/assistant';
import { ChatContextSkill, RunInstructions, SkillManagerSkill } from '@dxos/assistant-toolkit';
import * as AgentService from '@dxos/compute/AgentService';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Query, Ref, Registry } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { DXN, EntityId } from '@dxos/keys';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import * as RegistryPlugin from '@dxos/plugin-registry/RegistryPlugin';
import * as RoutinePlugin from '@dxos/plugin-routine/RoutinePlugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from '#meta';
import { AssistantPlugin } from '#plugin';
import { AssistantEvents, AssistantOperation } from '#types';

import { AssistantSkill } from './skills/assistant/index.ts';
import { PluginManagerSkill } from './skills/plugin-manager/index.ts';

EntityId.dangerouslyDisableRandomness();

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

// Memoized-replay cases (frozen A/B); gated off the default `:test` path. The module-activation
// boot test below carries the real composition signal and always runs.

describe('AssistantPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin.make({}), AssistantPlugin()],
    });

    // Dependency-mode roots activate immediately during the startup dependency pass.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([
        moduleId('AppGraphBuilder'),
        moduleId('schema'),
        moduleId('OperationHandler'),
        moduleId('AiService'),
        moduleId('AiContext'),
        moduleId('AgentRuntime'),
      ]),
    );
    // Demand-gated modules park until their events fire (CreateObjectRequested).
    expect(harness.manager.getActive()).not.toContain(moduleId('CreateObject'));
    // Skills ride the assistant's start event, which the harness fires post-startup.
    expect(harness.manager.getActive()).toContain(moduleId('SkillDefinition'));

    // Space-affinity LayerSpec — resolution requires a space context.
    const { defaultSpace } = await EffectEx.runAndForwardErrors(
      initializeIdentity(harness.get(ClientCapabilities.Client)),
    );
    await harness.runPromise(
      Effect.gen(function* () {
        const aiService = yield* AiService.AiService;
        expect(aiService).toBeDefined();
      }).pipe(Effect.provide(ServiceResolver.provide({ space: defaultSpace.id }, AiService.AiService))),
    );
  });

  test('offers the plugin-manager skill only where the registry plugin is present', async ({ expect }) => {
    const skillKeys = (harness: { getAll: (capability: any) => any[] }) =>
      harness.getAll(AppCapabilities.SkillDefinition).map((definition: { key: string }) => definition.key);

    {
      // The curated production and mobile sets ship no registry, so the skill's verbs would have no
      // handlers there.
      await using harness = await createComposerTestApp({
        plugins: [ClientPlugin.make({}), AssistantPlugin()],
      });
      expect(skillKeys(harness)).not.toContain(PluginManagerSkill.key);
    }

    {
      await using harness = await createComposerTestApp({
        plugins: [ClientPlugin.make({}), AssistantPlugin(), RegistryPlugin.make()],
      });
      expect(skillKeys(harness)).toContain(PluginManagerSkill.key);
    }
  });

  test('binds the plugin-manager skill into new chats where the registry plugin is present', async ({ expect }) => {
    // The skill only helps if it reaches the model, and it does that by being bound to the chat --
    // a user who never opens chat settings would otherwise never see a plugin offered.
    const boundSkillUris = async (plugins: Plugin.Plugin[]) => {
      await using harness = await createComposerTestApp({ plugins });
      const { defaultSpace } = await EffectEx.runAndForwardErrors(
        initializeIdentity(harness.get(ClientCapabilities.Client)),
      );

      // Awaited inside the helper: `await using` disposes the harness -- and its runtime -- when
      // this function returns.
      return await harness.runPromise(
        Effect.gen(function* () {
          const { object: chat } = yield* Operation.invoke(
            AssistantOperation.CreateChat,
            { name: 'test' },
            { spaceId: defaultSpace.id },
          );
          yield* Database.flush();

          const feed = yield* Database.load(chat.feed);
          const bindings = yield* Feed.query(feed, Query.type(AiContext.Binding)).run;
          return bindings.flatMap((binding) => binding.skills.added.map((ref) => ref.uri));
        }).pipe(Effect.provide(ServiceResolver.provide({ space: defaultSpace.id }, Database.Service))),
      );
    };

    const withRegistry = await boundSkillUris([ClientPlugin.make({}), AssistantPlugin(), RegistryPlugin.make()]);
    expect(withRegistry.some((uri) => uri.includes(PluginManagerSkill.key))).toBe(true);
    // Every host still gets the rest of the default set, so a missing registry costs only this skill.
    expect(withRegistry.some((uri) => uri.includes(AssistantSkill.key))).toBe(true);

    const withoutRegistry = await boundSkillUris([ClientPlugin.make({}), AssistantPlugin()]);
    expect(withoutRegistry.some((uri) => uri.includes(PluginManagerSkill.key))).toBe(false);
    expect(withoutRegistry.some((uri) => uri.includes(AssistantSkill.key))).toBe(true);
  });

  test('resolves a language model through the plugin AI service', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [
        ClientPlugin.make({}),
        AssistantPlugin({
          aiServiceMiddleware: ScriptedLanguageModel.scriptedAiServiceMiddleware([
            { parts: [ScriptedLanguageModel.text('Paris is the capital of France.')] },
          ]),
        }),
      ],
    });

    const { defaultSpace } = await EffectEx.runAndForwardErrors(
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
            Layer.provideMerge(ServiceResolver.provide({ space: defaultSpace.id }, AiService.AiService)),
          ),
        ),
      ),
    );
  });

  test('runs instructions end to end through the plugin', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [
        ClientPlugin.make({}),
        AssistantPlugin({
          aiServiceMiddleware: ScriptedLanguageModel.scriptedAiServiceMiddleware([
            { parts: [ScriptedLanguageModel.toolCall('completeJob', { success: { capital: 'paris' } })] },
            { parts: [ScriptedLanguageModel.text('Done.')] },
          ]),
        }),
        RoutinePlugin.make(),
      ],
    });

    const { defaultSpace } = await EffectEx.runAndForwardErrors(
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
          { spaceId: defaultSpace.id },
        );
        expect(result).toEqual({ capital: 'paris' });
      }).pipe(Effect.provide(ServiceResolver.provide({ space: defaultSpace.id }, Database.Service))),
    );
  });

  test(
    'boots the agent service with the standard skills and completes a turn',
    { timeout: 120_000 },
    async ({ expect }) => {
      await using harness = await createComposerTestApp({
        plugins: [
          ClientPlugin.make({}),
          AssistantPlugin({
            aiServiceMiddleware: ScriptedLanguageModel.scriptedAiServiceMiddleware([
              { parts: [ScriptedLanguageModel.text('Hello back.')] },
            ]),
          }),
          RoutinePlugin.make(),
        ],
      });

      const { defaultSpace } = await initializeIdentity(harness.get(ClientCapabilities.Client)).pipe(
        EffectEx.runAndForwardErrors,
      );

      // Skills ride the assistant's start event; the harness already fired it, but fire
      // deterministically here to mirror the headless toolkit-materialization path.
      await EffectEx.runAndForwardErrors(harness.manager.activate(AssistantEvents.Start));

      await harness.runPromise(
        Effect.gen(function* () {
          const skills = yield* Effect.forEach([ChatContextSkill, AssistantSkill, SkillManagerSkill], (_) =>
            Skill.resolve(_.key),
          );
          expect(skills).toHaveLength(3);

          const agent = yield* AgentServiceRuntime.createSession({
            skills,
          });
          yield* agent.submitPrompt('Hello');
          yield* agent.waitForCompletion();
        }).pipe(
          Effect.provide(
            ServiceResolver.provide(
              { space: defaultSpace.id },
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

//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import type { Evalite } from 'evalite';

import { AiService, type ModelName } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { type Plugin } from '@dxos/app-framework';
import { type TestHarness } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { AgentPrompt } from '@dxos/assistant-toolkit';
import { Operation, Routine, ServiceResolver, type Blueprint } from '@dxos/compute';
import { Database, Feed, Ref, Tag } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { type SpaceId } from '@dxos/keys';
import { AssistantPlugin } from '@dxos/plugin-assistant/plugin';
import { AutomationPlugin } from '@dxos/plugin-automation/plugin';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { Mailbox } from '@dxos/plugin-inbox';
import { InboxPlugin } from '@dxos/plugin-inbox/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { Employer, Organization, Person } from '@dxos/types';
import { trim } from '@dxos/util';

const DEFAULT_MODEL: ModelName = 'ai.claude.model.claude-opus-4-6';

const SYSTEM_INSTRUCTIONS = trim`
  You are running within an evaluation environment.
  The prompt is the specification for the eval.
  Perform the instructions precisely and do not deviate.
  Do not fake any work if the provided tools don't work.
  The goal is to measure real behavior, so be honest about the results.
  If available tools prevented you from completing the task fully, report the failure.
  Do not fall back on your own knowledge, only use the tools provided.
`;

const makeAiServiceMiddleware = (): Promise<(_upstream: AiService.Service) => AiService.Service> =>
  AiService.AiService.pipe(
    Effect.provide(AiServiceTestingPreset('direct')),
    Effect.map((service) => (_upstream: AiService.Service) => service),
    EffectEx.runAndForwardErrors,
  );

const createDefaultPlugins = async (options: { plugins?: Plugin.Plugin[] }): Promise<Plugin.Plugin[]> => [
  ClientPlugin({
    types: [Organization.Organization, Person.Person, Employer.Employer, Tag.Tag, Mailbox.Mailbox],
  }),
  AssistantPlugin({
    aiServiceMiddleware: await makeAiServiceMiddleware(),
  }),
  AutomationPlugin(),
  InboxPlugin(),
  ...(options.plugins ?? []),
];

const seedPrompt = (prompt: Routine.Routine) =>
  Effect.gen(function* () {
    for (const blueprintRef of prompt.blueprints) {
      const blueprint = yield* Database.load(blueprintRef);
      yield* Database.add(blueprint);
    }
    yield* Database.add(prompt);
    yield* Database.flush();
  });

const runAgentPrompt = <I>(
  harness: TestHarness,
  prompt: Routine.Routine,
  model: ModelName,
  spaceId: SpaceId,
  input: I,
) =>
  harness.runPromise(
    Effect.gen(function* () {
      yield* seedPrompt(prompt);
      return yield* Operation.invoke(
        AgentPrompt,
        {
          prompt: Ref.make(prompt),
          input,
          systemInstructions: SYSTEM_INSTRUCTIONS,
          model,
        },
        { spaceId },
      );
    }).pipe(Effect.provide(ServiceResolver.provide({ space: spaceId }, Database.Service, Feed.FeedService))),
  );

export interface CreateEvalRunnerOptions<I, O> {
  instructions: string;
  input: Schema.Schema<I>;
  output: Schema.Schema<O>;
  blueprints?: Ref.Ref<Blueprint.Blueprint>[];
  model?: ModelName;
  plugins?: Plugin.Plugin[];
}

export type VariantConfig =
  | undefined
  | {
      model?: ModelName;
    };

/**
 * Creates an Evalite task that runs the assistant against a Routine and returns the agent's output.
 *
 * Model precedence: `variant.model` → `options.model` → `DEFAULT_MODEL`.
 *
 * The task creates a full Composer test harness via `createComposerTestApp` / `createDefaultPlugins`,
 * initializes an identity, fires `SetupArtifactDefinition`, then invokes `runAgentPrompt` with the
 * resolved model and the personal space. All execution is wrapped in an Effect scope; errors are
 * propagated to the caller via `EffectEx.runAndForwardErrors`.
 */
export const createEvalRunner = <I, O>(options: CreateEvalRunnerOptions<I, O>): Evalite.Task<I, O, VariantConfig> => {
  return async (input: I, variant: VariantConfig) => {
    const model = variant?.model ?? options.model ?? DEFAULT_MODEL;

    const prompt = Routine.make({
      instructions: options.instructions,
      blueprints: options.blueprints ?? [],
      input: options.input,
      output: options.output,
    });

    return EffectEx.runAndForwardErrors(
      Effect.scoped(
        Effect.gen(function* () {
          const harness = yield* Effect.acquireRelease(
            Effect.promise(async () =>
              createComposerTestApp({
                plugins: await createDefaultPlugins(options),
              }),
            ),
            (testHarness) => Effect.promise(() => testHarness.dispose()),
          );

          yield* Effect.promise(() => harness.fire(AppActivationEvents.SetupArtifactDefinition));

          const { personalSpace } = yield* Effect.promise(() =>
            EffectEx.runAndForwardErrors(initializeIdentity(harness.get(ClientCapabilities.Client))),
          );

          return yield* Effect.promise(() => runAgentPrompt(harness, prompt, model, personalSpace.id, input));
        }),
      ),
    );
  };
};

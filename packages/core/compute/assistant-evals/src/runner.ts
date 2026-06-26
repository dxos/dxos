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
import { RunInstructions } from '@dxos/assistant-toolkit';
import { Operation, Instructions, ServiceResolver, type Skill } from '@dxos/compute';
import { Database, Ref, Tag } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { type SpaceId } from '@dxos/keys';
import { AssistantPlugin } from '@dxos/plugin-assistant/plugin';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { Mailbox } from '@dxos/plugin-inbox';
import { InboxPlugin } from '@dxos/plugin-inbox/plugin';
import { RoutinePlugin } from '@dxos/plugin-routine/plugin';
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
  RoutinePlugin(),
  InboxPlugin(),
  ...(options.plugins ?? []),
];

const seedInstructions = (instructions: Instructions.Instructions) =>
  Effect.gen(function* () {
    for (const skillRef of instructions.skills) {
      const skill = yield* Database.load(skillRef);
      yield* Database.add(skill);
    }
    yield* Database.add(instructions);
    yield* Database.flush();
  });

const runInstructions = <I>(
  harness: TestHarness,
  instructions: Instructions.Instructions,
  model: ModelName,
  spaceId: SpaceId,
  input: I,
) =>
  harness.runPromise(
    Effect.gen(function* () {
      yield* seedInstructions(instructions);
      return yield* Operation.invoke(
        RunInstructions,
        {
          instructions: Ref.make(instructions),
          input,
          systemInstructions: SYSTEM_INSTRUCTIONS,
          model,
        },
        { spaceId },
      );
    }).pipe(Effect.provide(ServiceResolver.provide({ space: spaceId }, Database.Service))),
  );

export interface CreateEvalRunnerOptions<I, O> {
  instructions: string;
  input: Schema.Schema<I>;
  output: Schema.Schema<O>;
  skills?: Ref.Ref<Skill.Skill>[];
  model?: ModelName;
  plugins?: Plugin.Plugin[];
}

export type VariantConfig =
  | undefined
  | {
      model?: ModelName;
    };

/**
 * Creates an Evalite task that runs the assistant against Instructions and returns the agent's output.
 *
 * Model precedence: `variant.model` → `options.model` → `DEFAULT_MODEL`.
 *
 * The task creates a full Composer test harness via `createComposerTestApp` / `createDefaultPlugins`,
 * initializes an identity, fires `SetupArtifactDefinition`, then invokes `runInstructions` with the
 * resolved model and the personal space. All execution is wrapped in an Effect scope; errors are
 * propagated to the caller via `EffectEx.runAndForwardErrors`.
 */
export const createEvalRunner = <I, O>(options: CreateEvalRunnerOptions<I, O>): Evalite.Task<I, O, VariantConfig> => {
  return async (input: I, variant: VariantConfig) => {
    const model = variant?.model ?? options.model ?? DEFAULT_MODEL;

    const instructions = Instructions.make({
      text: options.instructions,
      skills: options.skills ?? [],
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

          return yield* Effect.promise(() => runInstructions(harness, instructions, model, personalSpace.id, input));
        }),
      ),
    );
  };
};

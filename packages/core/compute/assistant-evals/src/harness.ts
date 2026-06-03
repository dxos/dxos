//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AiService, type ModelName } from '@dxos/ai';
import { AiServiceTestingPreset, TestAiService } from '@dxos/ai/testing';
import { type Plugin } from '@dxos/app-framework';
import { type TestHarness } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { AgentPrompt } from '@dxos/assistant-toolkit';
import { Operation, Routine, ServiceResolver } from '@dxos/compute';
import { Database, Feed, Ref, Tag } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
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

const DEFAULT_MODEL: ModelName = '@anthropic/claude-opus-4-6';

const SYSTEM_INSTRUCTIONS = trim`
  You are running within an evaluation environment.
  The prompt is the specification for the eval.
  Perform the instructions precisely and do not deviate.
  Do not fake any work if the provided tools don't work.
  The goal is to measure real behavior, so be honest about the results.
  If available tools prevented you from completing the task fully, report the failure.
  Do not fall back on your own knowledge, only use the tools provided.
`;

export interface RunAgentEvalOptions extends Pick<Routine.MakeOptions, 'name' | 'blueprints' | 'input' | 'output'> {
  instructions: string;
  completionCriteria?: readonly string[];
  model?: ModelName;
  plugins?: Plugin.Plugin[];
}

const formatInstructions = (instructions: string, completionCriteria: readonly string[] = []): string => {
  if (completionCriteria.length === 0) {
    return instructions;
  }
  const criteria = completionCriteria.map((item) => `- ${item}`).join('\n');
  return `${instructions}\n\nCompletion criteria:\n${criteria}`;
};

const makeAiServiceMiddleware = (): Promise<(_upstream: AiService.Service) => AiService.Service> =>
  AiService.AiService.pipe(
    Effect.provide(AiServiceTestingPreset('direct')),
    Effect.map((service) => (_upstream: AiService.Service) => service),
    runAndForwardErrors,
  );

const createDefaultPlugins = async (options: RunAgentEvalOptions): Promise<Plugin.Plugin[]> => [
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

const runAgentPrompt = (harness: TestHarness, prompt: Routine.Routine, model: ModelName, spaceId: SpaceId) =>
  harness.runPromise(
    Effect.gen(function* () {
      yield* seedPrompt(prompt);
      return yield* Operation.invoke(
        AgentPrompt,
        {
          prompt: Ref.make(prompt),
          input: {},
          systemInstructions: SYSTEM_INSTRUCTIONS,
          model,
        },
        { spaceId },
      );
    }).pipe(Effect.provide(ServiceResolver.provide({ space: spaceId }, Database.Service, Feed.FeedService))),
  );

/**
 * Run an agent prompt in a composer test harness (live LLM, no memoization).
 */
export const runAgentEval = (options: RunAgentEvalOptions): Promise<unknown> => {
  const model = options.model ?? DEFAULT_MODEL;

  const prompt = Routine.make({
    name: options.name,
    instructions: formatInstructions(options.instructions, options.completionCriteria),
    blueprints: options.blueprints ?? [],
    input: options.input,
    output: options.output,
  });

  return runAndForwardErrors(
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
          runAndForwardErrors(initializeIdentity(harness.get(ClientCapabilities.Client))),
        );

        return yield* Effect.promise(() => runAgentPrompt(harness, prompt, model, personalSpace.id));
      }),
    ),
  );
};

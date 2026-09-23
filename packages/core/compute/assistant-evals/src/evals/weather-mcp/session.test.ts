//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { RunInstructions } from '@dxos/assistant-toolkit';
import { FeedTraceSink } from '@dxos/compute-runtime';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Skill from '@dxos/compute/Skill';
import { Collection, Database, Obj, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import * as WeatherSpace from '@dxos/plugin-debug/WeatherSpace';
import * as RoutinePlugin from '@dxos/plugin-routine/RoutinePlugin';
import * as DatabaseSkill from '@dxos/plugin-space/DatabaseSkill';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import * as SpacePlugin from '@dxos/plugin-space/SpacePlugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { findObject, toolInvocations } from '../../assertions.ts';
import { EvalRunError } from '../../errors.ts';
import { OPENING_PROMPT, SKILL_KEY, evaluateHandOff, seed } from './scenario.ts';
import { startWorkerSpecServer } from './worker-spec-server.ts';

const BERLIN = { latitude: 52.52, longitude: 13.41 };

const FORECAST = { current: { temperature_2m: 14.6, wind_speed_10m: 9.1 }, hourly: { temperature_2m: [14.6] } };

/** The loopback endpoint the spec server hands out; what a configuring write has to name here. */
const LOOPBACK_SERVER = /http:\/\/127\.0\.0\.1:\d+\//;

// The eval's headline hand-off, offline: the model is scripted and the Worker is the task text on a
// loopback port; everything between them (plugin stack, turn loop, skill binding, MCP client) is real.
describe('weather MCP hand-off', () => {
  test(
    'a server configured mid-run is connected on the session’s next turn',
    { timeout: 120_000 },
    async ({ expect }) => {
      // Filled in once the space is seeded and the server is up; the script reads them when it emits.
      const target: { skill?: string; server?: string } = {};

      await using harness = await createComposerTestApp({
        plugins: [
          ClientPlugin.make({ types: [...WeatherSpace.make().schemas, Collection.Collection] }),
          AssistantPlugin.make({
            aiServiceMiddleware: ScriptedLanguageModel.scriptedAiServiceMiddleware([
              // Step three: the configuring write, as the task text tells the session to make it.
              {
                parts: [
                  ScriptedLanguageModel.toolCall(Operation.toolName(SpaceOperation.UpdateObject), () => ({
                    // A ref reaches a tool as its URI; the envelope form is for values inside a patch.
                    object: target.skill,
                    properties: { mcpServers: [{ name: 'weather', url: target.server, protocol: 'http' }] },
                  })),
                ],
              },
              // Step four: the tool exists on this turn only if the session connected the server it
              // configured on the previous one.
              { parts: [ScriptedLanguageModel.toolCall('get_weather', BERLIN)] },
              { parts: [ScriptedLanguageModel.toolCall('completeJob', { success: 'called' })] },
              { parts: [ScriptedLanguageModel.text('Done.')] },
            ]),
          }),
          RoutinePlugin.make(),
          SpacePlugin.make({}),
        ],
      });

      const { defaultSpace } = await EffectEx.runAndForwardErrors(
        initializeIdentity(harness.get(ClientCapabilities.Client)),
      );

      await harness.runPromise(
        Effect.gen(function* () {
          const server = yield* startWorkerSpecServer({ fetchForecast: async () => FORECAST });
          target.server = server.url;

          const instructions = Instructions.make({
            text: OPENING_PROMPT,
            skills: [Ref.make(DatabaseSkill.make())],
          });
          const seeded = yield* seed({ spaceId: defaultSpace.id, instructions });
          Obj.update(instructions, (instructions) => {
            instructions.objects ??= [];
            instructions.objects.push(...(seeded.objects ?? []));
          });

          const skill = yield* findObject(Skill.Skill, (candidate) => Obj.getMeta(candidate).key === SKILL_KEY);
          if (!skill) {
            return yield* Effect.fail(
              new EvalRunError({ message: 'The template did not seed the Weather MCP skill.' }),
            );
          }
          expect(skill.mcpServers).toEqual([]);
          target.skill = Obj.getURI(skill);

          // As the eval runner seeds a run: bound skills and instructions go into the space first.
          for (const ref of instructions.skills) {
            yield* Database.add(yield* Database.load(ref));
          }
          yield* Database.add(instructions);
          yield* Database.flush();

          const output = yield* Operation.invoke(
            RunInstructions,
            { instructions: Ref.make(instructions), input: null, chat: seeded.chat },
            { spaceId: defaultSpace.id },
          );
          expect(output).toBe('called');

          // The session dialed the server it had just configured, and the skill now lists it.
          expect(server.initializations()).toBeGreaterThan(0);
          expect(skill.mcpServers).toEqual([{ name: 'weather', url: server.url, protocol: 'http' }]);

          // Read off the transcript the way the eval's scorers do.
          const invocations = yield* toolInvocations();
          expect(evaluateHandOff(invocations, { server: LOOPBACK_SERVER })).toEqual({
            configured: true,
            called: true,
            calledAfterConfiguring: true,
          });
          const call = invocations.find(({ name }) => name === 'get_weather');
          expect(call?.error).toBeUndefined();
          // The trace holds the tool's text result re-serialized, so the field arrives escaped.
          expect(String(call?.result)).toContain('temperature_2m');
        }).pipe(
          Effect.scoped,
          Effect.provide(
            ServiceResolver.provide({ space: defaultSpace.id }, Database.Service, FeedTraceSink.FeedTraceSink),
          ),
        ),
      );
    },
  );
});

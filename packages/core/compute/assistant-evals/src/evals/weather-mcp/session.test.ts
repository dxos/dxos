//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { ScriptedLanguageModel } from '@dxos/ai/testing';
import * as AgentOperation from '@dxos/assistant-toolkit/AgentOperation';
import * as SkillManagerSkill from '@dxos/assistant-toolkit/SkillManagerSkill';
import { FeedTraceSink } from '@dxos/compute-runtime';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import { Collection, Database, Filter, Obj, Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { AccessToken, Connection } from '@dxos/link';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import * as WeatherSpace from '@dxos/plugin-debug/WeatherSpace';
import * as RoutinePlugin from '@dxos/plugin-routine/RoutinePlugin';
import * as SpacePlugin from '@dxos/plugin-space/SpacePlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import { toolInvocations } from '../../assertions.ts';
import { OPENING_PROMPT, evaluateHandOff, seed } from './scenario.ts';
import { startWorkerSpecServer } from './worker-spec-server.ts';

await Harness.preload({
  plugins: [
    ClientPlugin.make({ types: [...WeatherSpace.make().schemas, Collection.Collection] }),
    AssistantPlugin.make(),
    RoutinePlugin.make(),
    SpacePlugin.make({}),
  ],
});

const BERLIN = { latitude: 52.52, longitude: 13.41 };

const FORECAST = { current: { temperature_2m: 14.6, wind_speed_10m: 9.1 }, hourly: { temperature_2m: [14.6] } };

/** The loopback endpoint the spec server hands out; what the add has to name here. */
const LOOPBACK_SERVER = /http:\/\/127\.0\.0\.1:\d+\//;

// The eval's headline hand-off, offline: the model is scripted and the Worker is the task text on a
// loopback port; everything between them (plugin stack, turn loop, connection, MCP client) is real.
describe('weather MCP hand-off', () => {
  test('a server added mid-run is connected on the session’s next turn', { timeout: 120_000 }, async ({ expect }) => {
    // Filled in once the space is seeded and the server is up; the script reads them when it emits.
    const target: { server?: string } = {};

    await using harness = await Harness.createComposerTestApp({
      plugins: [
        ClientPlugin.make({
          types: [
            ...WeatherSpace.make().schemas,
            Collection.Collection,
            Connection.Connection,
            AccessToken.AccessToken,
          ],
        }),
        AssistantPlugin.make({
          aiServiceMiddleware: ScriptedLanguageModel.scriptedAiServiceMiddleware([
            // Step three: the add, as the task text tells the session to make it.
            {
              parts: [
                ScriptedLanguageModel.toolCall(
                  Operation.toolName(SkillManagerSkill.Operations.AddMcpConnection),
                  () => ({ url: target.server, name: 'weather' }),
                ),
              ],
            },
            // Step four: the tool exists on this turn only if the session connected the server it
            // added on the previous one.
            { parts: [ScriptedLanguageModel.toolCall('mcp__weather__get_weather', BERLIN)] },
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
          skills: [Ref.make(SkillManagerSkill.make())],
        });
        const seeded = yield* seed({ spaceId: defaultSpace.id });
        Obj.update(instructions, (instructions) => {
          instructions.objects ??= [];
          instructions.objects.push(...(seeded.objects ?? []));
        });

        // As the eval runner seeds a run: bound skills and instructions go into the space first.
        for (const ref of instructions.skills) {
          yield* Database.add(yield* Database.load(ref));
        }
        yield* Database.add(instructions);
        yield* Database.flush();

        const output = yield* Operation.invoke(
          AgentOperation.RunInstructions,
          { instructions: Ref.make(instructions), input: null, chat: seeded.chat },
          { spaceId: defaultSpace.id },
        );
        expect(output).toBe('called');

        // The session dialed the server it had just added, and the space holds it as a connection.
        expect(server.initializations()).toBeGreaterThan(0);
        const connections = yield* Database.query(Filter.type(Connection.Connection)).run;
        expect(connections.map(({ name, mcp }) => ({ name, mcp }))).toEqual([
          { name: 'weather', mcp: { url: server.url, protocol: 'http' } },
        ]);

        // Read off the transcript the way the eval's scorers do.
        const invocations = yield* toolInvocations();
        expect(evaluateHandOff(invocations, { server: LOOPBACK_SERVER })).toEqual({
          configured: true,
          called: true,
          calledAfterConfiguring: true,
        });
        const call = invocations.find(({ name }) => name === 'mcp__weather__get_weather');
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
  });
});

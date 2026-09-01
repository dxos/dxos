//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Result from 'effect/Result';

import { AgentService } from '@dxos/agent-runtime';
import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Feed, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Organization } from '@dxos/types';

import { SetAlarm } from './operations/definitions.ts';
import { AlarmHandlers } from './operations/index.ts';
import { resolveWakeAt } from './operations/resolve-wake-at.ts';
import AlarmSkill from './skill.ts';

EntityId.dangerouslyDisableRandomness();

const NOW = new Date('2026-06-04T12:00:00.000Z').getTime();

const TestLayer = AssistantTestLayer({
  types: [Organization.Organization, Feed.Feed, Skill.Skill],
  operationHandlers: AlarmHandlers,
  skills: [AlarmSkill.make()],
  disableLlmMemoization: true,
});

describe('Alarm skill', () => {
  // The set-alarm operation resolves the wake time; cover the parsing seam directly.
  describe('resolveWakeAt', () => {
    it('resolves an absolute "at" timestamp', ({ expect }) => {
      const at = '2026-06-04T18:00:00.000Z';
      const result = resolveWakeAt({ at }, NOW);
      expect(Result.isSuccess(result)).toBe(true);
      expect(Result.getOrThrow(result)).toBe(new Date(at).getTime());
    });

    it('resolves a relative "in" duration', ({ expect }) => {
      const result = resolveWakeAt({ in: '5 minutes' }, NOW);
      expect(Result.isSuccess(result)).toBe(true);
      expect(Result.getOrThrow(result)).toBe(NOW + 5 * 60 * 1000);
    });

    it('rejects an invalid "at" timestamp', ({ expect }) => {
      expect(Result.isFailure(resolveWakeAt({ at: 'not-a-date' }, NOW))).toBe(true);
    });

    it('rejects an invalid "in" duration', ({ expect }) => {
      expect(Result.isFailure(resolveWakeAt({ in: 'whenever' }, NOW))).toBe(true);
    });

    it('rejects specifying both "in" and "at"', ({ expect }) => {
      expect(Result.isFailure(resolveWakeAt({ in: '5 minutes', at: '2026-06-04T18:00:00.000Z' }, NOW))).toBe(true);
    });

    it('rejects specifying neither "in" nor "at"', ({ expect }) => {
      expect(Result.isFailure(resolveWakeAt({}, NOW))).toBe(true);
    });
  });

  // The set-alarm operation reaches the live host through HarnessService Tier B. createSession spawns
  // an AgentProcess stamped as the harness host, so invoking the operation against that conversation
  // dispatches over the process RPC loopback to the host's AlarmManager (no LLM turn required).
  describe('set-alarm operation (Tier B)', () => {
    it.effect(
      'arms a self-wake on the owning host for a relative duration',
      Effect.fnUntraced(
        function* ({ expect }) {
          const agent = yield* AgentService.createSession({ skills: [AlarmSkill.make()] });
          const conversation = Obj.getURI(agent.feed);

          const result = yield* Operation.invoke(SetAlarm, { in: '1 hour', message: 'finish the report' }).pipe(
            Effect.provide(Operation.withInvocationOptions({ conversation })),
          );

          // A success message (rather than a NotSupportedError) proves the operation resolved the live
          // host and the Tier B RPC armed the alarm. Fire timing is covered by the AlarmManager unit
          // tests and the process control-surface test in functions-runtime.
          expect(result).toContain('Alarm scheduled to wake you at');
        },
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
    );

    it.effect(
      'arms a self-wake on the owning host for an absolute time',
      Effect.fnUntraced(
        function* ({ expect }) {
          const agent = yield* AgentService.createSession({ skills: [AlarmSkill.make()] });
          const conversation = Obj.getURI(agent.feed);

          const at = '2026-06-04T18:00:00.000Z';
          const result = yield* Operation.invoke(SetAlarm, { at }).pipe(
            Effect.provide(Operation.withInvocationOptions({ conversation })),
          );

          expect(result).toBe(`Alarm scheduled to wake you at ${at}.`);
        },
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
    );

    it.effect(
      'reports invalid input without arming an alarm',
      Effect.fnUntraced(
        function* ({ expect }) {
          const agent = yield* AgentService.createSession({ skills: [AlarmSkill.make()] });
          const conversation = Obj.getURI(agent.feed);

          const result = yield* Operation.invoke(SetAlarm, { in: 'whenever' }).pipe(
            Effect.provide(Operation.withInvocationOptions({ conversation })),
          );

          expect(result).toContain('Invalid');
        },
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
    );
  });
});

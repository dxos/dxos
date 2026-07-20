//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Either from 'effect/Either';

import { AgentService } from '@dxos/agent-runtime';
import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { Operation, Skill } from '@dxos/compute';
import { Feed, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Organization } from '@dxos/types';

import { AlarmHandlers } from './operations';
import { SetAlarm } from './operations/definitions';
import { resolveWakeAt } from './operations/resolve-wake-at';
import AlarmSkill from './skill';

EntityId.dangerouslyDisableRandomness();

const NOW = new Date('2026-06-04T12:00:00.000Z').getTime();

const TestLayer = AssistantTestLayer({
  types: [Organization.Organization, Feed.Feed, Skill.Skill],
  operationHandlers: AlarmHandlers,
  skills: [AlarmSkill.make()],
});

describe('Alarm skill', () => {
  // The set-alarm operation resolves the wake time; cover the parsing seam directly.
  describe('resolveWakeAt', () => {
    it('resolves an absolute "at" timestamp', ({ expect }) => {
      const at = '2026-06-04T18:00:00.000Z';
      const result = resolveWakeAt({ at }, NOW);
      expect(Either.isRight(result)).toBe(true);
      expect(Either.getOrThrow(result)).toBe(new Date(at).getTime());
    });

    it('resolves a relative "in" duration', ({ expect }) => {
      const result = resolveWakeAt({ in: '5 minutes' }, NOW);
      expect(Either.isRight(result)).toBe(true);
      expect(Either.getOrThrow(result)).toBe(NOW + 5 * 60 * 1000);
    });

    it('rejects an invalid "at" timestamp', ({ expect }) => {
      expect(Either.isLeft(resolveWakeAt({ at: 'not-a-date' }, NOW))).toBe(true);
    });

    it('rejects an invalid "in" duration', ({ expect }) => {
      expect(Either.isLeft(resolveWakeAt({ in: 'whenever' }, NOW))).toBe(true);
    });

    it('rejects specifying both "in" and "at"', ({ expect }) => {
      expect(Either.isLeft(resolveWakeAt({ in: '5 minutes', at: '2026-06-04T18:00:00.000Z' }, NOW))).toBe(true);
    });

    it('rejects specifying neither "in" nor "at"', ({ expect }) => {
      expect(Either.isLeft(resolveWakeAt({}, NOW))).toBe(true);
    });
  });

  // The set-alarm operation reaches the live host through HarnessService Tier B. createSession spawns
  // an AgentProcess stamped as the harness host, so invoking the operation against that conversation
  // dispatches over the process RPC loopback to the host's AlarmManager (no LLM turn required).
  describe('set-alarm operation (Tier B)', () => {
    it.scoped(
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

    it.scoped(
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

    it.scoped(
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

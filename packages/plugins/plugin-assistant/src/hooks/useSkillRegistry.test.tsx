//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { renderHook, waitFor } from '@testing-library/react';
import * as Effect from 'effect/Effect';
import { describe, expect, test } from 'vitest';

import { AiContext } from '@dxos/assistant';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { Database, Feed, Obj } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';

import { getSkillId, useActiveSkills, useSkillHandlers, useSkills } from './useSkillRegistry';

/**
 * A skill the user authored in a space, which — unlike a registry skill — carries no registry key.
 */
const makeSpaceSkill = (name: string) => Obj.make(Skill.Skill, { name, instructions: Template.make(), tools: [] });

const setup = Effect.fnUntraced(function* () {
  const feed = yield* Database.add(Feed.make());
  const runtime = yield* Effect.context<Database.Service>();
  const context = new AiContext.Binder({ feed, runtime });
  yield* Effect.promise(() => context.open());
  return { context };
});

describe('skill picker hooks', () => {
  const TestLayer = TestDatabaseLayer({ types: [Feed.Feed, Skill.Skill, Text.Text] });

  test('binds a keyless space skill', async () => {
    await Effect.gen(function* () {
      const { context } = yield* setup();
      const skill = yield* Database.add(makeSpaceSkill('Local'));

      const { result } = renderHook(() => ({
        active: useActiveSkills({ context }),
        handlers: useSkillHandlers({ context }),
      }));

      yield* Effect.promise(() => result.current.handlers.onUpdateSkill(skill, true));
      yield* Effect.promise(() => waitFor(() => expect(result.current.active.has(getSkillId(skill))).toBe(true)));

      // Survives a re-read of the feed: the binding is persisted, not just optimistic state.
      yield* Effect.promise(() => context.sync());
      expect(context.getSkills().map((bound) => bound.id)).toEqual([skill.id]);

      yield* Effect.promise(() => result.current.handlers.onUpdateSkill(skill, false));
      yield* Effect.promise(() => waitFor(() => expect(result.current.active.has(getSkillId(skill))).toBe(false)));
      yield* Effect.promise(() => context.close());
    })
      .pipe(Effect.provide(TestLayer))
      .pipe(Effect.runPromise);
  });

  test('lists keyless space skills as distinct entries', async () => {
    await Effect.gen(function* () {
      const first = yield* Database.add(makeSpaceSkill('A'));
      const second = yield* Database.add(makeSpaceSkill('B'));
      const db = Obj.getDatabase(first);

      const { result } = renderHook(() => useSkills({ db }));
      yield* Effect.promise(() => waitFor(() => expect(result.current).toHaveLength(2)));
      expect(result.current.map((skill) => skill.id).sort()).toEqual([first.id, second.id].sort());
    })
      .pipe(Effect.provide(TestLayer))
      .pipe(Effect.runPromise);
  });
});

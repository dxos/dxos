//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Database, DXN, Obj, Type } from '@dxos/echo';
import { registryLayer } from '@dxos/echo-client';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';

import * as Skill from './Skill.ts';

const SKILL_KEY = 'org.dxos.skill.example';

/** A type declaring {@link SKILL_KEY}, so `resolveAnnotatedSkills` has a key to look up. */
class Annotated extends Type.makeObject<Annotated>(DXN.make('org.dxos.type.test.annotated', '0.1.0'))(
  Schema.Struct({ name: Schema.optional(Schema.String) }).pipe(Skill.SkillsAnnotation.set([SKILL_KEY])),
) {}

describe('Skill', () => {
  describe('mcpPrompt', () => {
    // The flag rides in the object's meta rather than as a schema field, so a skill stored in a
    // space carries it too — `Definition` is a build-time factory type and could not.
    test('opting in is readable off the constructed skill', ({ expect }) => {
      const skill = Skill.make({ key: 'org.dxos.skill.example', name: 'Example', mcpPrompt: true });
      expect(Skill.isMcpPrompt(skill)).toBe(true);
    });

    test('a skill that does not opt in is not projected', ({ expect }) => {
      // Absence is the default, not an error: most skills are written for an in-app chat runtime
      // and assume tools an MCP client does not have.
      const skill = Skill.make({ key: 'org.dxos.skill.example', name: 'Example' });
      expect(Skill.isMcpPrompt(skill)).toBe(false);
    });

    test('opting out explicitly reads as not projected', ({ expect }) => {
      const skill = Skill.make({ key: 'org.dxos.skill.example', name: 'Example', mcpPrompt: false });
      expect(Skill.isMcpPrompt(skill)).toBe(false);
    });
  });

  describe('resolveAnnotatedSkills', () => {
    test('a key only the registry serves binds by registry URI', async ({ expect }) => {
      const uris = await resolve({ registry: [Skill.make({ key: SKILL_KEY, name: 'Registry' })] });
      expect(uris).toEqual([Skill.registryURI(SKILL_KEY)]);
    });

    test('a space copy wins over the registry, so a fork carries the user edits', async ({ expect }) => {
      const uris = await resolve({
        registry: [Skill.make({ key: SKILL_KEY, name: 'Registry' })],
        space: [Skill.make({ key: SKILL_KEY, name: 'Fork' })],
      });
      expect(uris).toHaveLength(1);
      expect(uris[0]).not.toBe(Skill.registryURI(SKILL_KEY));
    });

    test('a key neither source serves contributes nothing', async ({ expect }) => {
      expect(await resolve()).toEqual([]);
    });
  });
});

/** Resolves against a database holding `space` and a registry holding `registry`. */
const resolve = ({ registry = [], space = [] }: { registry?: Skill.Skill[]; space?: Skill.Skill[] } = {}) =>
  EffectEx.runPromise(
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      space.forEach((skill) => db.add(skill));
      const subject = db.add(Obj.make(Annotated, {}));
      yield* Database.flush();
      const refs = yield* Skill.resolveAnnotatedSkills(subject);
      return refs.map((ref) => ref.uri);
    }).pipe(
      Effect.provide(
        Layer.mergeAll(TestDatabaseLayer({ types: [Annotated, Skill.Skill] }), registryLayer({ initial: registry })),
      ),
    ),
  );

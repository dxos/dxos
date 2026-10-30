//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Database, Obj, Ref, URI } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';
import { Outline, TaskSet } from '@dxos/types';

import { Feature, Spec } from '#types';

import { attach } from '../operations/feature/util.ts';
import { featureBindings } from './subject-context.ts';

describe('featureBindings', () => {
  it.effect('binds the spec listing a tracked feature and its project, in the project context', () =>
    Effect.gen(function* () {
      const skill = Ref.fromURI(URI.make('dxn:echo:@:skill-1'));
      const context = yield* Database.add(Text.make({ content: 'Context.' }));
      const instructions = yield* Database.add(
        Instructions.make({ text: 'Steer.', skills: [skill], objects: [Ref.make(context)] }),
      );
      const { project, root } = yield* addProject(Ref.make(instructions));
      const sync = yield* addFeature(root, 'Sync');
      const syncSpec = yield* Database.add(Spec.make({ name: 'Sync' }));
      Obj.update(sync, (sync) => {
        sync.spec = Ref.make(syncSpec);
      });
      const gmail = yield* addFeature(syncSpec, 'Gmail');
      yield* Database.flush();

      const bindings = yield* featureBindings(gmail);
      expect(bindings.skills?.map((ref) => ref.uri)).toEqual([skill.uri]);
      expect(bindings.objects?.map((ref) => ref.peek())).toEqual([context, syncSpec, project]);
      expect(bindings.instructions?.peek()).toEqual(instructions);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect("binds the spec and project when the project's instructions no longer exist", () =>
    Effect.gen(function* () {
      const { project, root } = yield* addProject(Ref.fromURI(URI.make(`dxn:echo:@:${Obj.ID.random()}`)));
      const feature = yield* addFeature(root, 'Sync');
      yield* Database.flush();

      const bindings = yield* featureBindings(feature);
      expect(bindings.objects?.map((ref) => ref.peek())).toEqual([root, project]);
      expect(bindings.instructions).toBeUndefined();
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('binds only the spec of a feature no project tracks', () =>
    Effect.gen(function* () {
      const spec = yield* Database.add(Spec.make({ name: 'Loose' }));
      const feature = yield* addFeature(spec, 'Orphan');
      yield* Database.flush();

      const bindings = yield* featureBindings(feature);
      expect(bindings.objects?.map((ref) => ref.peek())).toEqual([spec]);
      expect(bindings.instructions).toBeUndefined();
    }).pipe(Effect.provide(TestLayer)),
  );
});

const TestLayer = TestDatabaseLayer({
  types: [
    Feature.Feature,
    Instructions.Instructions,
    Outline.Outline,
    Project.Project,
    Spec.Spec,
    TaskSet.TaskSet,
    Text.Text,
  ],
});

/** A project owning its top-level spec, `root`. */
const addProject = Effect.fn(function* (instructions: Ref.Ref<Instructions.Instructions>) {
  const project = yield* Database.add(Project.make({ name: 'Inbox' }));
  const root = yield* Database.add(Spec.make({ name: 'Inbox' }));
  Obj.update(project, (project) => {
    project.instructions = instructions;
    project.spec = Ref.make(root);
  });
  return { project, root };
});

const addFeature = Effect.fn(function* (spec: Spec.Spec, name: string) {
  const feature = yield* Database.add(Feature.make({ name, status: 'planned' }));
  attach(spec, feature);
  return feature;
});

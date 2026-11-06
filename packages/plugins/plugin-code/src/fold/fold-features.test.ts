//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Database, Filter, Obj, Ref, Relation } from '@dxos/echo';
import { getTextInAnchorRange, toCursorRange } from '@dxos/echo-client';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Doc } from '@dxos/echo-doc';
import { Text } from '@dxos/schema';
import { AnchoredTo, Task, Thread } from '@dxos/types';

import { Feature, FeatureEmbed, FeatureMap, Showcase, SpecItem } from '#types';

import { foldFeatures } from './fold-features.ts';

const layer = TestDatabaseLayer({
  types: [
    AnchoredTo.AnchoredTo,
    Feature.DependsOn,
    Feature.Feature,
    Feature.Implements,
    Project.Project,
    Showcase.Demonstrates,
    Spec.Spec,
    SpecItem.Implements,
    Task.Task,
    Text.Text,
    Thread.Thread,
  ],
});

describe('fold-features', () => {
  it.effect('writes each feature into its spec as a block and moves what pointed at it to the item', () =>
    Effect.gen(function* () {
      const sorting = yield* Database.add(
        Feature.make({
          name: 'Sorted inbox',
          description: 'Mail lands in the folder its sender suggests.',
          status: 'prototype',
          requirements: [{ text: "A known sender's mail goes to its folder." }, { text: 'Unknown mail stays put.' }],
        }),
      );
      const sync = yield* Database.add(Feature.make({ name: 'Sync', status: 'operational' }));
      const breakdown = yield* Database.add(Spec.make({ name: 'Sorting rules' }));
      Obj.update(sorting, (sorting) => {
        sorting.spec = Ref.make(breakdown);
      });
      const embed = FeatureEmbed.make({ label: sorting.name, uri: Obj.getURI(sorting) });
      const spec = yield* Database.add(FeatureMap.make({ name: 'Inbox', content: `An inbox.\n\n${embed}\n` }));
      FeatureMap.setFeatures(spec, [sorting, sync]);
      const project = yield* Database.add(Project.make({ name: 'Inbox', specs: [Ref.make(spec)] }));
      yield* Database.add(Feature.makeDependsOn({ [Relation.Source]: sorting, [Relation.Target]: sync }));
      const task = yield* Database.add(Task.make({ title: 'Write the rules' }));
      yield* Database.add(Feature.makeImplements({ [Relation.Source]: task, [Relation.Target]: sorting }));
      const [requirement] = Feature.getRequirements(sorting);
      const path = ['requirements', requirement.key, 'text'];
      const [from, to] = toCursorRange(Doc.createAccessor(sorting, path), 2, 14).split(':');
      const thread = yield* Database.add(Thread.make());
      yield* Database.add(
        AnchoredTo.make({
          [Relation.Source]: thread,
          [Relation.Target]: sorting,
          anchor: AnchoredTo.formatPathAnchor({ path, from, to }),
        }),
      );
      yield* Database.flush();

      expect(yield* foldFeatures()).toEqual({ specs: 1, features: 2, relations: 2, threads: 1 });
      yield* Database.flush();

      const text = yield* Database.load(spec.content);
      const keys = [...text.content.matchAll(/^feat (\w+): (.+)$/gm)].map(([, key, title]) => [key, title]);
      expect(keys.map(([, title]) => title)).toEqual(['Sorted inbox', 'Sync']);
      const [[sortingKey], [syncKey]] = keys;
      expect(text.content.startsWith('An inbox.\n\n```mdl\nfeat ')).toBe(true);
      expect(text.content).toContain(`  status: prototype\n  needs: [${syncKey}]\n  spec: echo:///${breakdown.id}`);
      expect(text.content).toMatch(/\n {2}req [a-z2-9]{5}: A known sender's mail goes to its folder\.\n/);
      expect(spec.dialects).toContain('org.dxos.spec.software');
      expect(spec.dialects).not.toContain(FeatureMap.DIALECT);

      expect(yield* Database.query(Filter.type(Feature.Feature)).run).toEqual([]);
      const [implemented] = yield* Database.query(Filter.type(SpecItem.Implements)).run;
      expect(Relation.getTarget(implemented).id).toBe(spec.id);
      expect(implemented.item).toBe(sortingKey);
      const [anchored] = (yield* Database.query(Filter.type(AnchoredTo.AnchoredTo)).run).filter(
        (relation) => Relation.getTarget(relation).id === spec.id,
      );
      expect(getTextInAnchorRange(Doc.createAccessor(text, ['content']), anchored.anchor!)).toBe('known sender');
      expect(project.specs.map((ref) => ref.uri.toString())).toContain(Ref.make(breakdown).uri.toString());

      expect(yield* foldFeatures()).toEqual({ specs: 0, features: 0, relations: 0, threads: 0 });
    }).pipe(Effect.provide(layer)),
  );
});

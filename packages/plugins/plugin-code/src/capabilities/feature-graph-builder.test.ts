//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import { setupGraphBuilder } from '@dxos/app-graph/testing';
import * as Spec from '@dxos/compute/Spec';
import { Database, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as GraphNode from '@dxos/graph/GraphNode';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import * as ProjectGraph from '@dxos/plugin-projects/ProjectGraph';

import { Feature } from '#types';

import { attach } from '../operations/feature/util.ts';
import { createFeatureLevelExtension, createSpecBreakdownsExtension } from './feature-graph-builder.ts';

describe('feature app graph builder', () => {
  test("lists the specs that break down a spec's features as its children, nested to any depth", async ({ expect }) => {
    await EffectEx.runPromise(
      Effect.gen(function* () {
        const root = yield* Database.add(Spec.make({ name: 'DXOS' }));
        const addFeature = Effect.fn(function* (spec: Spec.Spec, name: string) {
          const feature = yield* Database.add(Feature.make({ name, status: 'planned' }));
          attach(spec, feature);
          return feature;
        });
        const addBreakdown = Effect.fn(function* (feature: Feature.Feature) {
          const breakdown = yield* Database.add(Spec.make({ name: feature.name }));
          Obj.update(feature, (feature) => {
            feature.spec = Ref.make(breakdown);
          });
          return breakdown;
        });

        // Two features with breakdowns, added in reverse of the order they are listed in, and one without.
        const sync = yield* addFeature(root, 'Sync');
        yield* addFeature(root, 'Search');
        const compose = yield* addFeature(root, 'Compose');
        const composeSpec = yield* addBreakdown(compose);
        const syncSpec = yield* addBreakdown(sync);
        const drafts = yield* addFeature(syncSpec, 'Drafts');
        const draftsSpec = yield* addBreakdown(drafts);
        yield* Database.flush();

        const extensions = yield* createSpecBreakdownsExtension();
        const children = yield* Effect.promise(() => getSubjectChildren(root, extensions));
        expect(children.map((node) => node.data)).toEqual([syncSpec, composeSpec]);
        const grandchildren = yield* Effect.promise(() => getSubjectChildren(syncSpec, extensions));
        expect(grandchildren.map((node) => node.data)).toEqual([draftsSpec]);
        expect(yield* Effect.promise(() => getSubjectChildren(draftsSpec, extensions))).toEqual([]);
      }).pipe(Effect.provide(TestDatabaseLayer({ types: [Spec.Spec, Feature.Feature] }))),
    );
  });

  test('nests each feature of a spec level beneath it as a level of its own, to any depth', async ({ expect }) => {
    await EffectEx.runPromise(
      Effect.gen(function* () {
        const root = yield* Database.add(Spec.make({ name: 'Inbox' }));
        const addFeature = Effect.fn(function* (spec: Spec.Spec, name: string) {
          const feature = yield* Database.add(Feature.make({ name, status: 'planned' }));
          attach(spec, feature);
          return feature;
        });
        const sync = yield* addFeature(root, 'Sync');
        const compose = yield* addFeature(root, 'Compose');
        const syncSpec = yield* Database.add(Spec.make({ name: 'Sync' }));
        Obj.update(sync, (sync) => {
          sync.spec = Ref.make(syncSpec);
        });
        const gmail = yield* addFeature(syncSpec, 'Gmail');
        yield* Database.flush();

        const context = yield* Effect.promise(async () =>
          setupSubject(root, await EffectEx.runPromise(createFeatureLevelExtension()), ProjectGraph.SPEC_LEVEL_TYPE),
        );
        const children = async (...path: string[]) => {
          const id = GraphNode.qualifyId(GraphNode.RootId, SUBJECT_ID, ...path);
          await context.expand(id);
          return context.registry.get(context.graph.connections(id, 'child'));
        };

        // A level per feature, by name, holding the feature, addressed by the lineage of features above it.
        const levels = yield* Effect.promise(() => children());
        expect(levels.map((node) => node.data)).toEqual([compose, sync]);
        expect(levels.map((node) => node.type)).toEqual([ProjectGraph.SPEC_LEVEL_TYPE, ProjectGraph.SPEC_LEVEL_TYPE]);
        const nested = yield* Effect.promise(() => children(sync.id));
        expect(nested.map((node) => node.id)).toEqual([
          GraphNode.qualifyId(GraphNode.RootId, SUBJECT_ID, sync.id, gmail.id),
        ]);
        // A feature without a breakdown has nothing beneath it.
        expect(yield* Effect.promise(() => children(compose.id))).toEqual([]);
      }).pipe(Effect.provide(TestDatabaseLayer({ types: [Spec.Spec, Feature.Feature] }))),
    );
  });
});

const SUBJECT_ID = 'subject';

/** Graph holding one node whose data is `subject`, so the extension's match runs against it. */
const setupSubject = async (subject: unknown, extensions: AppGraphBuilder.BuilderExtension[], type = 'test') => {
  const rootExtensions = await EffectEx.runPromise(
    AppGraphBuilder.createExtension({
      id: 'testRoot',
      match: GraphNodeMatcher.whenRoot,
      connector: () =>
        Effect.succeed([{ id: SUBJECT_ID, type, data: subject, properties: { space: { id: 'SPACE' } } }]),
    }),
  );
  const context = setupGraphBuilder({ extensions: [...rootExtensions, ...extensions] });
  await context.expand(GraphNode.RootId);
  return context;
};

const getSubjectChildren = async (subject: unknown, extensions: AppGraphBuilder.BuilderExtension[]) => {
  const context = await setupSubject(subject, extensions);
  await context.expand(GraphNode.qualifyId(GraphNode.RootId, SUBJECT_ID));
  return context.registry.get(context.graph.connections(GraphNode.qualifyId(GraphNode.RootId, SUBJECT_ID), 'child'));
};

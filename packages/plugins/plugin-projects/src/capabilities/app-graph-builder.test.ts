//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import { setupGraphBuilder } from '@dxos/app-graph/testing';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Database, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as GraphNode from '@dxos/graph/GraphNode';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import { invariant } from '@dxos/invariant';
import * as AssistantOperation from '@dxos/plugin-assistant/AssistantOperation';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { Text } from '@dxos/schema';
import { Outline, TaskSet } from '@dxos/types';

import { Feature, Spec } from '#types';

import { attach } from '../operations/feature/util.ts';
import {
  ARTIFACTS_SECTION_TYPE,
  ARTIFACTS_SEGMENT,
  SPEC_LEVEL_TYPE,
  SPEC_SEGMENT,
  createProjectActionExtension,
  createProjectArtifactsActionExtension,
  createProjectArtifactsExtension,
  createProjectSpecExtension,
  createSpecBreakdownsExtension,
} from './app-graph-builder.ts';

describe('project app graph builder', () => {
  test('contributes create-chat to a project node, for the navtree row', async ({ expect }) => {
    const project = Project.make({ name: 'Test' });
    Obj.update(project, (project) => {
      project.instructions = Ref.make(Instructions.make({ text: 'Steer.' }));
    });

    const actions = await getSubjectActions(project);

    // Action ids are qualified by the node they hang off.
    expect(actions.map((action) => action.id)).toEqual([
      GraphNode.qualifyId(GraphNode.RootId, SUBJECT_ID, AssistantOperation.CreateChat.meta.key),
    ]);
    // Navtree only: the toolbar builds its own create-chat, so a `toolbar` disposition here would
    // render a second, identical button.
    expect(actions[0].properties.disposition).toEqual('list-item-primary');
  });

  test('ignores nodes that are not projects', async ({ expect }) => {
    expect(await getSubjectActions({ notAProject: true })).toEqual([]);
  });

  test('contributes a virtual Artifacts branch to a project node', async ({ expect }) => {
    const project = Project.make({ name: 'Test' });
    const nodes = await getSubjectChildren(project, await EffectEx.runPromise(createProjectArtifactsExtension()));

    const artifacts = nodes.find((node) => node.type === ARTIFACTS_SECTION_TYPE);
    invariant(artifacts);
    expect(artifacts.id).toEqual(
      GraphNode.qualifyId(GraphNode.qualifyId(GraphNode.RootId, SUBJECT_ID), ARTIFACTS_SEGMENT),
    );
    // Virtual, but it carries the project so the action extension can link what the dialog creates —
    // wrapped, so the Project-matching extensions do not claim the branch and nest it inside itself,
    // and tagged so a surface can tell it from the Chats branch, which wraps a project the same way.
    expect(artifacts.data).toEqual({ branch: 'artifacts', project });
    expect(Obj.instanceOf(Project.Project, artifacts.data)).toBe(false);
  });

  test('contributes an add-artifact action to the Artifacts branch', async ({ expect }) => {
    const project = Project.make({ name: 'Test' });
    const actions = await getSubjectActions(
      { branch: 'artifacts', project },
      await EffectEx.runPromise(createProjectArtifactsActionExtension()),
      ARTIFACTS_SECTION_TYPE,
    );

    expect(actions.map((action) => action.id)).toEqual([
      GraphNode.qualifyId(GraphNode.RootId, SUBJECT_ID, SpaceOperation.OpenObjectForm.meta.key),
    ]);
    expect(actions[0].properties.disposition).toEqual('list-item-primary');
  });

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

  test("lists a project's spec as a Spec branch, each feature a level beneath it, nested to any depth", async ({
    expect,
  }) => {
    await EffectEx.runPromise(
      Effect.gen(function* () {
        const project = yield* Database.add(Project.make({ name: 'Inbox' }));
        const root = yield* Database.add(Spec.make({ name: 'Inbox' }));
        Obj.update(project, (project) => {
          project.spec = Ref.make(root);
        });
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
          setupSubject(project, await EffectEx.runPromise(createProjectSpecExtension())),
        );
        const children = async (...path: string[]) => {
          const id = GraphNode.qualifyId(GraphNode.RootId, SUBJECT_ID, ...path);
          await context.expand(id);
          return context.registry.get(context.graph.connections(id, 'child'));
        };

        // The branch carries the project, wrapped so the Project-matching extensions leave it alone.
        const [branch] = yield* Effect.promise(() => children());
        expect(branch.id).toEqual(GraphNode.qualifyId(GraphNode.RootId, SUBJECT_ID, SPEC_SEGMENT));
        expect(branch.type).toEqual(SPEC_LEVEL_TYPE);
        expect(branch.data).toEqual({ branch: 'spec', project });
        // The branch only groups the levels; the project's own spec is the project node's Spec tab.
        expect(branch.properties.selectable).toBe(false);

        // A level per feature, by name, addressed by the lineage of features above it.
        const levels = yield* Effect.promise(() => children(SPEC_SEGMENT));
        expect(levels.map((node) => node.data)).toEqual([
          { branch: 'spec', project, feature: compose },
          { branch: 'spec', project, feature: sync },
        ]);
        expect(levels.map((node) => node.properties.selectable)).toEqual([true, true]);
        const nested = yield* Effect.promise(() => children(SPEC_SEGMENT, sync.id));
        expect(nested.map((node) => node.id)).toEqual([
          GraphNode.qualifyId(GraphNode.RootId, SUBJECT_ID, SPEC_SEGMENT, sync.id, gmail.id),
        ]);
        // A feature without a breakdown is a level with nothing beneath it.
        expect(yield* Effect.promise(() => children(SPEC_SEGMENT, compose.id))).toEqual([]);
      }).pipe(
        Effect.provide(
          TestDatabaseLayer({
            types: [Project.Project, Spec.Spec, Feature.Feature, Outline.Outline, TaskSet.TaskSet, Text.Text],
          }),
        ),
      ),
    );
  });
});

const SUBJECT_ID = 'subject';

/** Graph holding one node whose data is `subject`, so the extension's match runs against it. */
const setupSubject = async (
  subject: unknown,
  extensions: AppGraphBuilder.BuilderExtension[],
  type = 'test',
  space: unknown = { id: 'SPACE' },
) => {
  const rootExtensions = await EffectEx.runPromise(
    AppGraphBuilder.createExtension({
      id: 'testRoot',
      match: GraphNodeMatcher.whenRoot,
      // `space` rides on the node: the artifacts extension matches on it, as the real project nodes carry it.
      connector: () => Effect.succeed([{ id: SUBJECT_ID, type, data: subject, properties: { space } }]),
    }),
  );
  const context = setupGraphBuilder({ extensions: [...rootExtensions, ...extensions] });
  await context.expand(GraphNode.RootId);
  return context;
};

const getSubjectActions = async (subject: unknown, extensions?: AppGraphBuilder.BuilderExtension[], type?: string) => {
  const context = await setupSubject(
    subject,
    extensions ?? (await EffectEx.runPromise(createProjectActionExtension())),
    type,
  );

  // Actions are their own relation, materialized lazily like connections.
  await context.expand(GraphNode.qualifyId(GraphNode.RootId, SUBJECT_ID), 'action');

  // `graph.actions` returns an atom; read it through the registry the builder was created with.
  return context.registry.get(context.graph.actions(GraphNode.qualifyId(GraphNode.RootId, SUBJECT_ID)));
};

const getSubjectChildren = async (subject: unknown, extensions: AppGraphBuilder.BuilderExtension[]) => {
  const context = await setupSubject(subject, extensions);
  await context.expand(GraphNode.qualifyId(GraphNode.RootId, SUBJECT_ID));
  return context.registry.get(context.graph.connections(GraphNode.qualifyId(GraphNode.RootId, SUBJECT_ID), 'child'));
};

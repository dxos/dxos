//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import { setupGraphBuilder } from '@dxos/app-graph/testing';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
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

import { ARTIFACTS_SEGMENT } from '../paths.ts';
import * as ProjectGraph from '../ProjectGraph.ts';
import {
  ARTIFACTS_SECTION_TYPE,
  createProjectActionExtension,
  createProjectArtifactsActionExtension,
  createProjectArtifactsExtension,
  createProjectSpecExtension,
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

  test("lists a project's specs under a Specs branch, a level per spec", async ({ expect }) => {
    await EffectEx.runPromise(
      Effect.gen(function* () {
        const project = yield* Database.add(Project.make({ name: 'Inbox' }));
        const root = yield* Database.add(Spec.make({ name: 'Inbox' }));
        const talk = yield* Database.add(Spec.make({ name: 'Talk' }));
        Obj.update(project, (project) => {
          project.specs.push(Ref.make(root), Ref.make(talk));
        });
        yield* Database.flush();

        const context = yield* Effect.promise(async () =>
          setupSubject(project, await EffectEx.runPromise(createProjectSpecExtension())),
        );
        const children = async (...path: string[]) => {
          const id = GraphNode.qualifyId(GraphNode.RootId, SUBJECT_ID, ...path);
          await context.expand(id);
          return context.registry.get(context.graph.connections(id, 'child'));
        };

        // The branch only groups the levels: it stands for no object, and the project's own spec is its Spec tab.
        const [branch] = yield* Effect.promise(() => children());
        expect(branch.id).toEqual(GraphNode.qualifyId(GraphNode.RootId, SUBJECT_ID, ProjectGraph.SPECS_SEGMENT));
        expect(branch.type).toEqual(ProjectGraph.SPEC_BRANCH_TYPE);
        expect(branch.data).toBeNull();
        expect(branch.properties.selectable).toBe(false);

        // A level per spec, holding the spec, in the project's order; nothing nests beneath one without another plugin.
        const specs = yield* Effect.promise(() => children(ProjectGraph.SPECS_SEGMENT));
        expect(specs.map((node) => node.data)).toEqual([root, talk]);
        expect(specs.map((node) => node.type)).toEqual([ProjectGraph.SPEC_LEVEL_TYPE, ProjectGraph.SPEC_LEVEL_TYPE]);
        expect(yield* Effect.promise(() => children(ProjectGraph.SPECS_SEGMENT, root.id))).toEqual([]);
      }).pipe(
        Effect.provide(
          TestDatabaseLayer({ types: [Project.Project, Spec.Spec, Outline.Outline, TaskSet.TaskSet, Text.Text] }),
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

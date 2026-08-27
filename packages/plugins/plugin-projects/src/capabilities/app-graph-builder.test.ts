//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { qualifyId } from '@dxos/app-graph';
import * as GraphBuilder from '@dxos/app-graph/GraphBuilder';
import * as Node from '@dxos/app-graph/Node';
import * as NodeMatcher from '@dxos/app-graph/NodeMatcher';
import { setupGraphBuilder } from '@dxos/app-graph/testing';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Obj, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { ProjectOperation } from '#types';

import {
  ARTIFACTS_SECTION_TYPE,
  ARTIFACTS_SEGMENT,
  createProjectActionExtension,
  createProjectArtifactsActionExtension,
  createProjectArtifactsExtension,
} from './app-graph-builder';

describe('project app graph builder', () => {
  test('contributes create-chat to a project node, for the navtree row', async ({ expect }) => {
    const project = Project.make({ name: 'Test' });
    Obj.update(project, (project) => {
      project.instructions = Ref.make(Instructions.make({ text: 'Steer.' }));
    });

    const actions = await getSubjectActions(project);

    // Action ids are qualified by the node they hang off.
    expect(actions.map((action) => action.id)).toEqual([
      qualifyId(Node.RootId, SUBJECT_ID, ProjectOperation.CreateChat.meta.key),
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
    expect(artifacts.id).toEqual(qualifyId(qualifyId(Node.RootId, SUBJECT_ID), ARTIFACTS_SEGMENT));
    // Virtual, but it carries the project so the action extension can link what the dialog creates —
    // wrapped, so the Project-matching extensions do not claim the branch and nest it inside itself.
    expect(artifacts.data).toEqual({ project });
    expect(Obj.instanceOf(Project.Project, artifacts.data)).toBe(false);
  });

  test('contributes an add-artifact action to the Artifacts branch', async ({ expect }) => {
    const project = Project.make({ name: 'Test' });
    const actions = await getSubjectActions(
      { project },
      await EffectEx.runPromise(createProjectArtifactsActionExtension()),
      ARTIFACTS_SECTION_TYPE,
    );

    expect(actions.map((action) => action.id)).toEqual([
      qualifyId(Node.RootId, SUBJECT_ID, SpaceOperation.OpenObjectForm.meta.key),
    ]);
    expect(actions[0].properties.disposition).toEqual('list-item-primary');
  });
});

const SUBJECT_ID = 'subject';

/** Graph holding one node whose data is `subject`, so the extension's match runs against it. */
const setupSubject = async (
  subject: unknown,
  extensions: GraphBuilder.BuilderExtension[],
  type = 'test',
  space: unknown = { id: 'SPACE' },
) => {
  const rootExtensions = await EffectEx.runPromise(
    GraphBuilder.createExtension({
      id: 'testRoot',
      match: NodeMatcher.whenRoot,
      // `space` rides on the node: the artifacts extension matches on it, as the real project nodes carry it.
      connector: () => Effect.succeed([{ id: SUBJECT_ID, type, data: subject, properties: { space } }]),
    }),
  );
  const context = setupGraphBuilder({ extensions: [...rootExtensions, ...extensions] });
  await context.expand(Node.RootId);
  return context;
};

const getSubjectActions = async (subject: unknown, extensions?: GraphBuilder.BuilderExtension[], type?: string) => {
  const context = await setupSubject(
    subject,
    extensions ?? (await EffectEx.runPromise(createProjectActionExtension())),
    type,
  );

  // Actions are their own relation, materialized lazily like connections.
  await context.expand(qualifyId(Node.RootId, SUBJECT_ID), 'action');

  // `graph.actions` returns an atom; read it through the registry the builder was created with.
  return context.registry.get(context.graph.actions(qualifyId(Node.RootId, SUBJECT_ID)));
};

const getSubjectChildren = async (subject: unknown, extensions: GraphBuilder.BuilderExtension[]) => {
  const context = await setupSubject(subject, extensions);
  await context.expand(qualifyId(Node.RootId, SUBJECT_ID));
  return context.registry.get(context.graph.connections(qualifyId(Node.RootId, SUBJECT_ID), 'child'));
};

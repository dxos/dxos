//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { qualifyId } from '@dxos/app-graph';
import { setupGraphBuilder } from '@dxos/app-graph/testing';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Obj, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';

import { ProjectOperation } from '#types';

import { createProjectActionExtension } from './app-graph-builder';

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
});

const SUBJECT_ID = 'subject';

/** Graph holding one node whose data is `subject`, so the extension's match runs against it. */
const getSubjectActions = async (subject: unknown) => {
  const rootExtensions = await EffectEx.runPromise(
    GraphBuilder.createExtension({
      id: 'testRoot',
      match: NodeMatcher.whenRoot,
      connector: () => Effect.succeed([{ id: SUBJECT_ID, type: 'test', data: subject }]),
    }),
  );
  const actionExtensions = await EffectEx.runPromise(createProjectActionExtension());
  const context = setupGraphBuilder({ extensions: [...rootExtensions, ...actionExtensions] });

  await context.expand(Node.RootId);
  // Actions are their own relation, materialized lazily like connections.
  await context.expand(qualifyId(Node.RootId, SUBJECT_ID), 'action');

  // `graph.actions` returns an atom; read it through the registry the builder was created with.
  return context.registry.get(context.graph.actions(qualifyId(Node.RootId, SUBJECT_ID)));
};

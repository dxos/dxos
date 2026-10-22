//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Atom from 'effect/reactivity/Atom';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as ContainerModel from '@dxos/app-toolkit/ContainerModel';
import { Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Text } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { slideSourcesAtom } from '#deck';
import { meta } from '#meta';
import { Presentation } from '#types';

import { createSectionsExtension } from './app-graph-builder.ts';

const ROOT_ID = 'root';

describe('presentation sections', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db } = await builder.createDatabase({
      types: [Presentation.Presentation, Text.Text, Markdown.Document],
    });
    const presentation = db.add(Presentation.make({ name: 'Deck', slides: ['# One\n\nBody', 'No heading'] }));
    const notes = db.add(Markdown.make({ name: 'Notes', content: '# Notes' }));
    Presentation.link(presentation, notes);
    await db.flush({ indexes: true });

    const registry = AtomRegistry.make();
    const graphBuilder = AppGraphBuilder.make({ registry });
    AppGraphBuilder.addExtension(
      graphBuilder,
      AppGraphBuilder.createExtensionRaw({
        id: 'presentationRoot',
        connector: (node) =>
          Atom.make((get) =>
            Option.getOrUndefined(get(node))?.id === ROOT_ID
              ? [AppNode.makeObject({ get, db, object: presentation, navigable: true })].filter(isNonNullable)
              : [],
          ),
      }),
    );
    AppGraphBuilder.addExtension(graphBuilder, Effect.runSync(createSectionsExtension()));

    const graph = graphBuilder.graph;
    const presentationId = `${ROOT_ID}/${presentation.id}`;
    AppGraph.expandSync(graph, ROOT_ID, 'child');
    await AppGraphBuilder.flush(graphBuilder);
    AppGraph.expandSync(graph, presentationId, 'child');
    await AppGraphBuilder.flush(graphBuilder);

    const children = () => registry.get(graph.connections(presentationId, 'child'));
    const parent = () => Option.getOrUndefined(AppGraph.getNode(graph, presentationId));
    return { db, registry, graphBuilder, presentation, notes, children, parent };
  };

  const sectionIds = (presentation: Presentation.Presentation) => presentation.sections.map((ref) => ref.target?.id);

  test('children follow sections, labelled by heading, fallback or the linked object', async ({ expect }) => {
    const { presentation, notes, children } = await setup();
    const nodes = children();
    expect(nodes.map((node) => node.data.id)).toEqual(sectionIds(presentation));
    expect(nodes.map((node) => node.properties.label)).toEqual([
      'One',
      ['slide-fallback.label', { ns: meta.profile.key, count: 2 }],
      'Notes',
    ]);
    expect(nodes[2].data.id).toBe(notes.id);
  });

  test('rearranging the children writes sections', async ({ expect }) => {
    const { presentation, graphBuilder, children, parent } = await setup();
    const order = sectionIds(presentation);
    parent()?.properties.onRearrange(
      children()
        .map((child) => child.data)
        .reverse(),
    );
    expect(sectionIds(presentation)).toEqual([...order].reverse());

    await AppGraphBuilder.flush(graphBuilder);
    expect(children().map((child) => child.data.id)).toEqual([...order].reverse());
  });

  test('owned sections offer no remove; removing a linked one only unlinks', async ({ expect }) => {
    const { db, presentation, notes, parent } = await setup();
    const container = AppNode.getListOf(parent());
    expect(container?.removeLabel).toEqual(['remove-section.label', { ns: meta.profile.key }]);
    if (!container) {
      return;
    }
    const owned = presentation.sections[0].target;
    expect(owned).toBeDefined();
    if (!owned) {
      return;
    }

    expect(ContainerModel.isRemovable(container, owned)).toBe(false);
    expect(ContainerModel.isRemovable(container, notes)).toBe(true);
    ContainerModel.release({ container, object: notes });
    await db.flush();
    expect(presentation.sections).toHaveLength(2);
    expect(Obj.isDeleted(notes)).toBe(false);
  });

  test('a deleted section leaves the children, which match the deck', async ({ expect }) => {
    const { db, registry, graphBuilder, presentation, notes, children } = await setup();
    const deck = () => registry.get(slideSourcesAtom(presentation));
    registry.subscribe(slideSourcesAtom(presentation), () => {});
    db.remove(notes);
    await db.flush();
    await expect.poll(() => deck().map((source) => source.kind)).toEqual(['text', 'text']);
    await AppGraphBuilder.flush(graphBuilder);
    expect(children().map((child) => child.data.id)).toEqual(deck().map((source) => source.id));
  });
});

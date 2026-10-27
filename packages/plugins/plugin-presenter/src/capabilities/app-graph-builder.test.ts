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
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as ContainerModel from '@dxos/app-toolkit/ContainerModel';
import { Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Text } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { slideSourcesAtom } from '#deck';
import { meta } from '#meta';
import { Presentation } from '#types';

import { createSectionsExtension, createSlideActionsExtension } from './app-graph-builder.ts';

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
      types: [Presentation.Presentation, Presentation.Slide, Text.Text, Markdown.Document],
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
    AppGraphBuilder.addExtension(graphBuilder, Effect.runSync(createSlideActionsExtension()));

    const graph = graphBuilder.graph;
    const presentationId = `${ROOT_ID}/${presentation.id}`;
    AppGraph.expandSync(graph, ROOT_ID, 'child');
    await AppGraphBuilder.flush(graphBuilder);
    AppGraph.expandSync(graph, presentationId, 'child');
    await AppGraphBuilder.flush(graphBuilder);

    const children = () => registry.get(graph.connections(presentationId, 'child'));
    const parent = () => Option.getOrUndefined(AppGraph.getNode(graph, presentationId));
    return { db, registry, graph, graphBuilder, presentation, notes, children, parent };
  };

  test('a slide toggles hidden from its node, linked objects included', async ({ expect }) => {
    const { registry, graph, graphBuilder, children } = await setup();
    for (const node of [children()[0], children()[2]]) {
      const slide = node?.data;
      if (!Obj.instanceOf(Presentation.Slide, slide)) {
        throw new Error('The node is not a slide.');
      }
      const toggle = () =>
        registry
          .get(graph.actions(node.id))
          .filter(AppGraphNode.isAction)
          .find(({ id }) => id.endsWith(`/${meta.profile.key}.toggle-hidden`));
      AppGraph.expandSync(graph, node.id, 'action');
      await AppGraphBuilder.flush(graphBuilder);
      const hide = toggle();
      if (!hide) {
        throw new Error('The slide has no toggle-hidden action.');
      }
      expect(hide.properties.label).toEqual(['hide-slide.label', { ns: meta.profile.key }]);
      await EffectEx.runPromise(hide.data());
      expect(slide.hidden).toBe(true);
      await AppGraphBuilder.flush(graphBuilder);
      expect(toggle()?.properties.label).toEqual(['show-slide.label', { ns: meta.profile.key }]);
    }
  });

  const slideIds = (presentation: Presentation.Presentation) => presentation.slides.map((ref) => ref.target?.id);

  test('children are the slides, labelled by heading, fallback or the linked object', async ({ expect }) => {
    const { presentation, notes, children } = await setup();
    const nodes = children();
    expect(nodes.map((node) => node.data.id)).toEqual(slideIds(presentation));
    expect(nodes.map((node) => node.properties.label)).toEqual([
      'One',
      ['slide-fallback.label', { ns: meta.profile.key, count: 2 }],
      'Notes',
    ]);
    expect(Obj.instanceOf(Presentation.Slide, nodes[2].data) && nodes[2].data.content.target?.id).toBe(notes.id);
  });

  test('rearranging the children writes slides', async ({ expect }) => {
    const { presentation, graphBuilder, children, parent } = await setup();
    const order = slideIds(presentation);
    parent()?.properties.onRearrange(
      children()
        .map((child) => child.data)
        .reverse(),
    );
    expect(slideIds(presentation)).toEqual([...order].reverse());

    await AppGraphBuilder.flush(graphBuilder);
    expect(children().map((child) => child.data.id)).toEqual([...order].reverse());
  });

  test('slides are owned, so they are deleted rather than unlinked', async ({ expect }) => {
    const { presentation, parent } = await setup();
    const container = AppNode.getListOf(parent());
    expect(container?.removeLabel).toEqual(['remove-section.label', { ns: meta.profile.key }]);
    for (const ref of presentation.slides) {
      const slide = ref.target;
      expect(slide && container && ContainerModel.isRemovable(container, slide)).toBe(false);
    }
  });

  test('a slide whose content was deleted leaves the children, which match the deck', async ({ expect }) => {
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

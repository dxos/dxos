//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { renderHook } from '@testing-library/react';
import * as Registry from 'effect/reactivity/AtomRegistry';
import React, { type PropsWithChildren } from 'react';
import { describe, test, vi } from 'vitest';

import { type LayoutIntent, type Node, type Scene, applyIntent, findLayout } from '@dxos/scene';

import { type ConstrainIntent, type RenderList2D } from '../../model/index.ts';
import { createNode, initialKeys } from '../../utils/index.ts';
import { fromRenderLists2D } from '../../viewport2d/index.ts';
import { useDocumentStore } from './useDocumentStore.ts';

const COUNT = 200;

const grid = (count: number): RenderList2D => {
  const nodes: Record<string, Node> = {};
  const keys = initialKeys(count);
  for (let index = 0; index < count; index++) {
    const id = `n${index}`;
    nodes[id] = createNode({
      type: 'rect',
      id,
      z: keys[index],
      center: { x: (index % 20) * 64, y: Math.floor(index / 20) * 64 },
    });
  }
  return { id: 'root', nodes, links: {} };
};

const setup = (document: Scene.SceneDocument, options: { constrain?: ConstrainIntent; host?: boolean } = {}) => {
  const registry = Registry.make();
  const onIntent = vi.fn<(layout: string, intent: LayoutIntent) => void>();
  const wrapper = ({ children }: PropsWithChildren) => (
    <RegistryContext.Provider value={registry}>{children}</RegistryContext.Provider>
  );
  const hook = renderHook(
    () =>
      useDocumentStore(registry, {
        document,
        snap: () => false,
        constrain: options.constrain,
        onIntent: options.host === false ? undefined : onIntent,
      }),
    { wrapper },
  );
  const { store } = hook.result.current;
  const lists = () => registry.get(store.views);
  /** What a gesture leaves in the draw state on release: every node of `root` moved or resized by `change`. */
  const release = (change: (node: Node) => Node) => {
    const root = lists().root;
    registry.set(store.views, {
      ...lists(),
      root: { ...root, nodes: Object.fromEntries(Object.entries(root.nodes).map(([id, node]) => [id, change(node)])) },
    });
  };
  return { onIntent, lists, release };
};

const moved = (node: Node): Node => ({ ...node, center: { x: node.center.x + 10, y: node.center.y + 20 } });

/** The ids of the elements an intent writes. */
const writesOf = (intent: LayoutIntent): string[] =>
  intent.kind === 'batch'
    ? intent.intents.flatMap(writesOf)
    : intent.kind === 'update'
      ? [intent.id]
      : intent.kind === 'create'
        ? [intent.element.id]
        : [];

describe('useDocumentStore', () => {
  test('a drag of 200 elements writes once on release', ({ expect }) => {
    const { onIntent, release } = setup(fromRenderLists2D([grid(COUNT)]));
    expect(onIntent).not.toHaveBeenCalled();
    release(moved);
    expect(onIntent).toHaveBeenCalledTimes(1);
    const [layout, intent] = onIntent.mock.calls[0];
    expect(layout).toBe('root');
    expect(new Set(writesOf(intent)).size).toBe(COUNT);
  });

  test('resize emits a size update at release', ({ expect }) => {
    const document = fromRenderLists2D([grid(1)]);
    const { onIntent, release } = setup(document);
    release((node) => ({ ...node, size: { width: 64, height: 48 } }));
    expect(onIntent).toHaveBeenCalledTimes(1);
    const layout = findLayout(document, 'root');
    if (layout?.dim !== '2d') {
      throw new Error('The drawing has no 2D root layout.');
    }
    expect(applyIntent(layout, onIntent.mock.calls[0][1]).elements.n0.size).toEqual({ width: 64, height: 48 });
  });

  test('a write the mode refuses is drawn as stored', ({ expect }) => {
    const document = fromRenderLists2D([grid(2)]);
    const { onIntent, lists, release } = setup(document, { constrain: () => undefined });
    const before = lists().root.nodes.n0.center;
    release(moved);
    expect(onIntent).toHaveBeenCalledTimes(1);
    expect(lists().root.nodes.n0.center).toEqual(before);
  });

  test('with no host a change is drawn as stored', ({ expect }) => {
    const { onIntent, lists, release } = setup(fromRenderLists2D([grid(2)]), { host: false });
    const before = lists().root.nodes.n0.center;
    release(moved);
    expect(onIntent).not.toHaveBeenCalled();
    expect(lists().root.nodes.n0.center).toEqual(before);
  });
});

//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import React, { useLayoutEffect, useState } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';

import { createNodeRegistry, defaultNodePrototypes, defaultNodeTypes } from '@dxos/react-ui-canvas';
import { type LayoutIntent, type Scene, applyIntent } from '@dxos/scene';

import { useSceneSelection } from '../editor/index.ts';
import { CanvasEditor } from './CanvasEditor.tsx';

const DOCUMENT: Scene.SceneDocument = {
  scenes: [{ id: 's', dim: '2d', layout: 'root', camera: { center: { x: 0, y: 0 }, zoom: 1 } }],
  layouts: [
    {
      id: 'root',
      dim: '2d',
      elements: {
        a: { id: 'a', type: 'rect', center: { x: 0, y: 0 }, size: { width: 100, height: 100 } },
        b: { id: 'b', type: 'rect', center: { x: 300, y: 0 }, size: { width: 100, height: 100 } },
      },
    },
  ],
  models: [],
};

/** Selects `ids` through the editor's Selection aspect once mounted. */
const Select = ({ ids }: { ids: readonly string[] }) => {
  const { commands } = useSceneSelection('Select');
  useLayoutEffect(() => commands.select(ids), []);
  return null;
};

/** A host with no history or codec of its own, as `CanvasEditor`'s are: it applies each intent to its document. */
const Host = ({ children, nodes }: { children: React.ReactNode; nodes?: ReturnType<typeof createNodeRegistry> }) => {
  const [document, setDocument] = useState(DOCUMENT);
  const onIntent = (layout: string, intent: LayoutIntent) =>
    setDocument((current) => ({
      ...current,
      layouts: current.layouts.map((record) => (record.id === layout ? applyIntent(record, intent) : record)),
    }));
  return (
    <CanvasEditor.Root document={document} nodes={nodes} onIntent={onIntent}>
      {children}
    </CanvasEditor.Root>
  );
};

/** happy-dom lays nothing out, so the viewport is given a size for the engine to fit and zoom in. */
const SIZE = { clientWidth: 800, clientHeight: 600 };

describe('CanvasEditor on the shared parts', () => {
  const saved = Object.fromEntries(
    Object.keys(SIZE).map((key) => [key, Object.getOwnPropertyDescriptor(HTMLElement.prototype, key)]),
  );
  beforeAll(() => {
    for (const [key, value] of Object.entries(SIZE)) {
      Object.defineProperty(HTMLElement.prototype, key, { configurable: true, get: () => value });
    }
  });
  afterAll(() => {
    for (const [key, descriptor] of Object.entries(saved)) {
      descriptor && Object.defineProperty(HTMLElement.prototype, key, descriptor);
    }
  });
  afterEach(() => cleanup());

  test('the shared actions bar runs the engine’s own undo and delete, and offers its layout and debug', async () => {
    render(
      <Host>
        <Select ids={['b']} />
        <CanvasEditor.Viewport />
        <CanvasEditor.Actions />
      </Host>,
    );
    await waitFor(() => expect(document.querySelector('[data-node-id="b"]')).not.toBeNull());
    const bar = await screen.findByTestId('scene-actions');
    // A shape is made with its tool, so the bar has no button that makes one.
    expect(bar.querySelector('[data-testid="toolbar-create"]')).toBeNull();
    expect(bar.querySelector('[data-testid="scene-action-layout"]')).not.toBeNull();
    const undo = screen.getByTestId<HTMLButtonElement>('scene-action-undo');
    expect(undo.disabled).toBe(true);

    // The engine keeps the undo history of a host that gives none, so a delete through the bar is undoable.
    await act(async () => screen.getByTestId('scene-action-delete').click());
    await waitFor(() => expect(document.querySelector('[data-node-id="b"]')).toBeNull());
    await waitFor(() => expect(screen.getByTestId<HTMLButtonElement>('scene-action-undo').disabled).toBe(false));
    await act(async () => screen.getByTestId('scene-action-undo').click());
    await waitFor(() => expect(document.querySelector('[data-node-id="b"]')).not.toBeNull());

    const debug = screen.getByTestId('scene-action-debug');
    expect(debug.getAttribute('aria-pressed')).toBe('false');
    await act(async () => debug.click());
    await waitFor(() => expect(screen.getByTestId('scene-action-debug').getAttribute('aria-pressed')).toBe('true'));
  });

  test('the shared Layers section writes the layers its engine keeps for a host that hears none', async () => {
    render(
      <Host>
        <CanvasEditor.Viewport />
        <CanvasEditor.Layers />
      </Host>,
    );
    await waitFor(() => expect(document.querySelector('[data-node-id="b"]')).not.toBeNull());
    await act(async () => (await screen.findByTestId('layers-create')).click());
    await waitFor(() => expect(screen.getByTestId('layer-layer-2')).not.toBeNull());
    expect(screen.getByTestId('layer-layer').getAttribute('aria-selected')).not.toBe('true');
  });

  test('the tool rail offers every node type of the host’s registry: an image, a contributed kind', async () => {
    const nodes = createNodeRegistry(
      {
        ...defaultNodeTypes,
        image: { ...defaultNodeTypes.rect, name: 'Image', icon: 'ph--image--regular', key: 'I' },
        widget: { ...defaultNodeTypes.rect, name: 'Widget', icon: 'ph--puzzle-piece--regular', group: 'Plugins' },
      },
      defaultNodePrototypes,
    );
    render(
      <Host nodes={nodes}>
        <CanvasEditor.Viewport />
        <CanvasEditor.Tools />
      </Host>,
    );
    expect(await screen.findByTestId('canvas.tool.node:image')).not.toBeNull();
    expect(screen.getByTestId('canvas.tool.node:widget')).not.toBeNull();
  });
});

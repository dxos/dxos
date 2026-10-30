//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useEffect } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { type Layer, type LayoutIntent, type ModelIntent, type Scene } from '@dxos/scene';

import { type DimensionConfig, type ViewportProps } from './config.ts';
import { useSceneEditor } from './context.ts';
import { SceneEditor } from './SceneEditor.tsx';

const TestViewport = ({ document, editing, tool, children }: ViewportProps) => {
  const layout = document.layouts.find((record) => record.id === (editing ?? 'root'));
  return (
    <div
      data-testid='viewport'
      data-editing={editing ?? ''}
      data-tool={[tool.id, tool.object].filter(Boolean).join(':')}
      data-elements={Object.keys(layout?.elements ?? {}).join(',')}
    >
      {children}
    </div>
  );
};

const CONFIG: DimensionConfig = {
  dim: '3d',
  viewport: TestViewport,
  tools: [{ id: 'select', icon: 'ph--cursor--regular', label: 'Select', category: 'select' }],
  geometry: { pasteOffset: (pasted) => ({ x: pasted, y: 0, z: pasted }), snap: { move: 1 } },
  camera: { fit: (camera) => camera, zoom: (camera) => camera, percent: () => 100 },
  display: { themes: [{ id: 'cad', label: 'CAD' }], grids: ['lines'], guides: false },
  propertyForm: ({ element }) => (
    <p data-testid='property-form' data-type={element.type ?? ''}>
      {element.id}
    </p>
  ),
};

const document = (hidden = false): Scene.SceneDocument => ({
  scenes: [
    {
      id: 's',
      dim: '3d',
      layout: 'root',
      camera: { target: { x: 0, y: 0, z: 0 }, yaw: 0, pitch: 30, distance: 10, fov: 0.8, projection: 'perspective' },
    },
  ],
  layouts: [
    {
      id: 'root',
      dim: '3d',
      model: 'm',
      layers: { back: { id: 'back', name: 'Back', z: 'a0', hidden } },
      elements: {
        a: { id: 'a', type: 'cube', center: { x: 0, y: 0, z: 0 }, overrides: { hue: 'red' } },
        b: { id: 'b', type: 'cube', center: { x: 2, y: 0, z: 0 }, layer: 'back' },
        c: { id: 'c', object: 'gear', center: { x: 4, y: 0, z: 0 } },
      },
    },
    { id: 'gear-parts', dim: '3d', model: 'm', elements: { g: { id: 'g', type: 'sphere' } } },
  ],
  models: [{ id: 'm', dim: '3d', objects: { gear: { id: 'gear', type: 'composite', parts: 'gear-parts' } } }],
});

/** Selects `ids` once mounted, as a click in the viewport would. */
const Select = ({ ids }: { ids: string[] }) => {
  const { store } = useSceneEditor('Select');
  useEffect(() => store.select(ids), []);
  return null;
};

const Editor = ({
  doc = document(),
  select = [],
  onIntent = () => {},
  onModelIntent = () => [],
  onLayersChange,
}: {
  doc?: Scene.SceneDocument;
  select?: string[];
  onIntent?: (layout: string, intent: LayoutIntent) => void;
  onModelIntent?: (intent: ModelIntent) => readonly string[];
  onLayersChange?: (layout: string, layers: readonly Layer[]) => void;
}) => (
  <SceneEditor.Root
    config={CONFIG}
    document={doc}
    scene='s'
    docked
    onIntent={onIntent}
    onModelIntent={onModelIntent}
    onLayersChange={onLayersChange}
    display={{ theme: 'cad', grid: true, snap: false }}
  >
    <Select ids={select} />
    <SceneEditor.Viewport />
    <SceneEditor.Inspector />
  </SceneEditor.Root>
);

describe('SceneEditor sections', () => {
  afterEach(() => cleanup());

  test('Views lists the scene layout and drills into a composite', async () => {
    render(<Editor />);
    await waitFor(() => expect(screen.getByTestId('viewport').dataset.elements).toBe('a,b,c'));
    // The composite's row carries its parts under it; selecting a part opens the parts layout.
    expect(screen.getAllByText('gear').length).toBeGreaterThan(0);
  });

  test('Objects place picks the place tool for that object', async () => {
    render(<Editor />);
    await userEvent.click(await screen.findByTestId('object-gear'));
    await userEvent.click(screen.getByTestId('objects-place'));
    expect(screen.getByTestId('viewport').dataset.tool).toBe('place:gear');
    // A second click on the picked object opens its parts.
    await userEvent.click(screen.getByTestId('object-gear'));
    await waitFor(() => expect(screen.getByTestId('viewport').dataset.editing).toBe('gear-parts'));
  });

  test('Layers hide removes their elements from what the viewport draws', async () => {
    const onLayersChange = vi.fn();
    const { rerender } = render(<Editor onLayersChange={onLayersChange} />);
    await userEvent.click(await screen.findByTestId('layer-toggle-back'));
    expect(onLayersChange).toHaveBeenCalledWith('root', [{ id: 'back', name: 'Back', z: 'a0', hidden: true }]);
    rerender(<Editor doc={document(true)} onLayersChange={onLayersChange} />);
    expect(screen.getByTestId('viewport').dataset.elements).toBe('a,c');
  });

  test('Styles "new style from selection" defines a style in the model and points the element at it', async () => {
    const onIntent = vi.fn();
    const onModelIntent = vi.fn((_intent: ModelIntent): readonly string[] => []);
    render(<Editor select={['a']} onIntent={onIntent} onModelIntent={onModelIntent} />);
    await userEvent.click(await screen.findByTestId('styles-create'));
    expect(onModelIntent).toHaveBeenCalledWith({
      kind: 'style',
      model: 'm',
      id: 'style-1',
      style: { name: 'Style 1', hue: 'red' },
    });
    expect(onIntent).toHaveBeenCalledWith('root', {
      kind: 'batch',
      intents: [
        { kind: 'update', id: 'a', path: ['style'], value: 'style-1' },
        { kind: 'update', id: 'a', path: ['overrides'], value: undefined },
      ],
    });
  });

  test('Properties shows the config form for the one selected element', async () => {
    render(<Editor select={['a']} />);
    expect((await screen.findByTestId('property-form')).textContent).toBe('a');
  });

  test('Properties shows the element as drawn: the fields its object gives it apply', async () => {
    // `c` stores no type of its own; it places the `gear` object, whose type it draws as.
    render(<Editor select={['c']} />);
    expect((await screen.findByTestId('property-form')).dataset.type).toBe('composite');
  });
});

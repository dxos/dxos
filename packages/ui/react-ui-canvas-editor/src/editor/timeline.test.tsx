//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React, { useEffect } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { type Timeline, setKey } from '@dxos/animation';
import { type ViewportProps, sampleDocument } from '@dxos/react-ui-canvas';
import { type Scene } from '@dxos/scene';

import { type DimensionConfig } from './config.ts';
import { useSceneEditor } from './context.ts';
import { SceneEditor } from './SceneEditor.tsx';
import { type EditorShot, keySelection, placementFields } from './timeline.ts';

const document: Scene.SceneDocument = {
  scenes: [
    {
      id: 's',
      dim: '3d',
      layout: 'root',
      camera: { target: { x: 0, y: 0, z: 0 }, yaw: 0, pitch: 30, distance: 10, fov: 0.8, projection: 'perspective' },
    },
  ],
  layouts: [{ id: 'root', dim: '3d', elements: { a: { id: 'a', type: 'cube', center: { x: 0, y: 0, z: 0 } } } }],
  models: [],
};

const moving = (): Timeline =>
  setKey(setKey({ duration: 2, tracks: {} }, 'a', 'center', { t: 0, value: { x: 0, y: 0, z: 0 } }), 'a', 'center', {
    t: 2,
    value: { x: 4, y: 0, z: 0 },
  });

describe('sampleDocument and keySelection', () => {
  test('the document at t draws each track on its element, leaving the stored document alone', () => {
    const sampled = sampleDocument(document, 'root', moving(), 1);
    const element = sampled.layouts[0].elements.a;
    expect(element?.center).toEqual({ x: 2, y: 0, z: 0 });
    expect(document.layouts[0].elements.a?.center).toEqual({ x: 0, y: 0, z: 0 });
  });

  test("keying the selection adds a key at t for each animatable field, at the element's value", () => {
    const timeline = keySelection({
      document,
      layout: 'root',
      selection: ['a'],
      t: 1.5,
      fields: placementFields,
    });
    expect(timeline.tracks['a:center']?.keys).toEqual([{ t: 1.5, value: { x: 0, y: 0, z: 0 } }]);
  });
});

const TestViewport = ({ document, children }: ViewportProps) => (
  <div data-testid='viewport' data-center={JSON.stringify(document.layouts[0].elements.a?.center)}>
    {children}
  </div>
);

const CONFIG: DimensionConfig = {
  dim: '3d',
  viewport: TestViewport,
  tools: [],
  geometry: { pasteOffset: (pasted) => ({ x: pasted, y: 0, z: pasted }), snap: { move: 1 } },
  camera: { fit: (camera) => camera, reset: (camera) => camera, zoom: (camera) => camera, percent: () => 100 },
  display: { themes: [], grids: ['lines'], guides: false },
  propertyForm: () => null,
};

const Select = ({ ids }: { ids: string[] }) => {
  const { store } = useSceneEditor('Select');
  useEffect(() => store.select(ids), []);
  return null;
};

const Editor = ({
  shots,
  onIntent = () => {},
  onShotChange,
}: {
  shots: EditorShot[];
  onIntent?: () => void;
  onShotChange: (shot: string | undefined, timeline: Timeline) => void;
}) => (
  <SceneEditor.Root
    config={CONFIG}
    document={document}
    scene='s'
    onIntent={onIntent}
    display={{ theme: 'cad', grid: true, snap: false }}
    shots={shots}
    onShotChange={onShotChange}
  >
    <Select ids={['a']} />
    <SceneEditor.Viewport>
      <SceneEditor.Timeline />
    </SceneEditor.Viewport>
  </SceneEditor.Root>
);

describe('SceneEditor.Timeline', () => {
  afterEach(() => cleanup());

  test('the panel lists the shots staging the open scene', () => {
    render(
      <Editor
        shots={[
          { id: 'one', name: 'Intro', timeline: moving() },
          { id: 'two', name: 'Outro', timeline: { duration: 3, tracks: {} } },
        ]}
        onShotChange={() => {}}
      />,
    );
    expect(screen.getByTestId('timeline-shot-one').textContent).toContain('Intro');
    expect(screen.getByTestId('timeline-shot-two').textContent).toContain('Outro');
  });

  test('keying a selected element writes a track to the shot, not the layout', async () => {
    const onIntent = vi.fn();
    const onShotChange = vi.fn();
    render(
      <Editor
        shots={[{ id: 'one', timeline: { duration: 2, tracks: {} } }]}
        onIntent={onIntent}
        onShotChange={onShotChange}
      />,
    );
    // Enter on the play button keys the playhead.
    fireEvent.keyDown(await screen.findByTestId('timeline-play'), { key: 'Enter' });
    expect(onIntent).not.toHaveBeenCalled();
    expect(onShotChange).toHaveBeenCalledWith('one', expect.objectContaining({ duration: 2 }));
  });

  test('with no shot, keying creates one', async () => {
    const onShotChange = vi.fn();
    render(<Editor shots={[]} onShotChange={onShotChange} />);
    // Enter on the play button keys the playhead.
    fireEvent.keyDown(await screen.findByTestId('timeline-play'), { key: 'Enter' });
    const [shot, timeline] = onShotChange.mock.calls[0];
    expect(shot).toBeUndefined();
    expect(timeline.tracks['a:center']).toBeDefined();
  });
});

//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as Button from '@dxos/react-ui/Button';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { useRegistry } from '../../hooks/index.ts';
import { createSceneViewAtoms } from '../../model/atoms.ts';
import { createMemoryStore } from '../../model/store.ts';
import { ISOMETRIC_POSE, TOP_POSE, animateCamera } from '../../utils/camera.ts';
import { createNetworkTree } from '../../utils/testing.ts';
import { SceneView } from './SceneView.tsx';

/** How long the turn between the top and isometric views takes. */
const TURN_MS = 800;

/**
 * The network of compound objects, and a toolbar button that turns the camera between the top view (editable) and
 * the isometric one (read-only: a press pans, nothing selects).
 */
const DefaultStory = () => {
  const registry = useRegistry();
  const { store, root } = useMemo(() => {
    const { root, scenes } = createNetworkTree();
    return { store: createMemoryStore(scenes), root };
  }, []);
  const atoms = useMemo(() => createSceneViewAtoms(root), [root]);
  const [isometric, setIsometric] = useState(false);
  const cancelRef = useRef<() => void>(undefined);
  useEffect(() => () => cancelRef.current?.(), []);

  const turn = () => {
    const next = !isometric;
    setIsometric(next);
    cancelRef.current?.();
    const camera = registry.get(atoms.camera);
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    cancelRef.current = animateCamera(
      camera,
      { ...camera, ...(next ? ISOMETRIC_POSE : TOP_POSE) },
      viewport,
      (frame) => registry.set(atoms.camera, frame),
      undefined,
      TURN_MS,
    );
  };

  return (
    <div className='flex flex-col h-full'>
      <Toolbar.Root>
        <Button.Root
          icon={isometric ? 'ph--square--regular' : 'ph--cube--regular'}
          label={isometric ? 'Top view' : 'Isometric view'}
          data-testid='presentation-turn'
          onClick={turn}
        />
      </Toolbar.Root>
      <SceneView.Root classNames='grow' store={store} root={root} atoms={atoms}>
        <SceneView.Canvas />
        <SceneView.Navigation />
        <SceneView.Debug />
        <SceneView.Objects />
        <SceneView.Layers />
      </SceneView.Root>
    </div>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-canvas/SceneView/Presentation',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { translations: [...uiTranslations] },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Turning to isometric tilts the camera and makes the view read-only; turning back restores editing. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const transform = () =>
      canvasElement.querySelector<HTMLElement>('[style*="transform-origin: 0px 0px"]')?.style.transform ?? '';

    // 1. The view opens flat: no rotation in the camera's transform.
    await waitFor(() => expect(transform()).toMatch(/^scale/));

    // 2. Isometric: the camera turns to tilt 55°, spin -35°.
    await userEvent.click(canvas.getByTestId('presentation-turn'));
    await waitFor(() => expect(transform()).toContain('rotateX(55deg) rotateZ(-35deg)'), { timeout: 3000 });

    // 3. Back to the top view, which is flat again.
    await userEvent.click(canvas.getByTestId('presentation-turn'));
    await waitFor(() => expect(transform()).toMatch(/^scale/), { timeout: 3000 });
  },
};

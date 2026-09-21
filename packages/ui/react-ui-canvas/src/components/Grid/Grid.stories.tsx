//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { useViewport, useWheel } from '../../hooks/index.ts';
import { type Camera, type Point } from '../../model/types.ts';
import { panBy, screenToScene, zoomAt } from '../../utils/camera.ts';
import { GridComponent, type GridProps } from './Grid.tsx';

const ZOOM_STEP = 1.25;

/**
 * The grid under a camera: ctrl / cmd + wheel zooms about the pointer, wheel or drag pans, the readout shows
 * the zoom and the scene bounds in view, and the toolbar steps the zoom or resets the camera to the origin.
 */
const DefaultStory = ({ size, showAxes }: GridProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const viewport = useViewport(ref);
  const [camera, setCamera] = useState<Camera>({ zoom: 1, x: 0, y: 0 });
  const interactedRef = useRef(false);
  const dragRef = useRef<Point | undefined>(undefined);

  // The origin sits at the centre of the view at 1:1, until the user moves the camera.
  const reset = useCallback(() => {
    setCamera({ zoom: 1, x: viewport.width / 2, y: viewport.height / 2 });
  }, [viewport]);
  useLayoutEffect(() => {
    if (!interactedRef.current && viewport.width > 0) {
      reset();
    }
  }, [viewport, reset]);

  useWheel(
    ref,
    useCallback((event, pointer) => {
      interactedRef.current = true;
      if (event.ctrlKey || event.metaKey) {
        setCamera((camera) => zoomAt(camera, pointer, camera.zoom * Math.exp(-event.deltaY * 0.01)));
      } else {
        setCamera((camera) => panBy(camera, { x: -event.deltaX / camera.zoom, y: -event.deltaY / camera.zoom }));
      }
    }, []),
  );

  const zoomBy = (factor: number) => {
    interactedRef.current = true;
    setCamera((camera) => zoomAt(camera, { x: viewport.width / 2, y: viewport.height / 2 }, camera.zoom * factor));
  };

  const topLeft = screenToScene(camera, { x: 0, y: 0 });
  const bottomRight = screenToScene(camera, { x: viewport.width, y: viewport.height });
  const format = (value: number) => Math.round(value).toString();

  return (
    <div
      ref={ref}
      className='relative dx-fill overflow-hidden cursor-grab active:cursor-grabbing'
      onPointerDown={(event) => {
        interactedRef.current = true;
        dragRef.current = { x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const from = dragRef.current;
        if (from) {
          const zoom = camera.zoom;
          setCamera((camera) =>
            panBy(camera, { x: (event.clientX - from.x) / zoom, y: (event.clientY - from.y) / zoom }),
          );
          dragRef.current = { x: event.clientX, y: event.clientY };
        }
      }}
      onPointerUp={() => {
        dragRef.current = undefined;
      }}
      onPointerCancel={() => {
        dragRef.current = undefined;
      }}
    >
      <GridComponent
        size={size}
        showAxes={showAxes}
        scale={camera.zoom}
        offset={{ x: camera.x * camera.zoom, y: camera.y * camera.zoom }}
      />
      <Toolbar.Root
        density='sm'
        classNames='absolute top-2 left-2 w-fit gap-1 px-2 py-1 rounded-sm bg-modal-surface border border-separator'
        onPointerDown={(event) => event.stopPropagation()}
      >
        <Toolbar.IconButton
          variant='ghost'
          iconOnly
          icon='ph--magnifying-glass-plus--regular'
          label='Zoom in'
          onClick={() => zoomBy(ZOOM_STEP)}
        />
        <Toolbar.IconButton
          variant='ghost'
          iconOnly
          icon='ph--magnifying-glass-minus--regular'
          label='Zoom out'
          onClick={() => zoomBy(1 / ZOOM_STEP)}
        />
        <Toolbar.IconButton variant='ghost' iconOnly icon='ph--crosshair--regular' label='Reset' onClick={reset} />
        <Toolbar.Separator variant='line' />
        <Toolbar.Text classNames='text-description font-mono text-sm whitespace-nowrap'>
          {Math.round(camera.zoom * 100)}% · [{format(topLeft.x)}, {format(topLeft.y)}] – [{format(bottomRight.x)},{' '}
          {format(bottomRight.y)}]
        </Toolbar.Text>
      </Toolbar.Root>
    </div>
  );
};

const meta: Meta<GridProps> = {
  title: 'ui/react-ui-canvas/scene/Grid',
  component: GridComponent,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
};

export default meta;

type Story = StoryObj<GridProps>;

export const Default: Story = {
  args: { size: 16, showAxes: true },
};

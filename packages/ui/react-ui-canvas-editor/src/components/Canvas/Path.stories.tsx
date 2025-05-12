//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect, useMemo, useRef } from 'react';

import { Canvas, type CanvasController, Grid, useCanvasContext, useWheel } from '@dxos/react-ui-canvas';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { useRope } from '../../hooks';

const DefaultStory = () => {
  const canvasRef = useRef<CanvasController>(null);
  useEffect(() => {
    // TODO(burdon): Pan up.
    // void canvasRef.current?.setProjection({ scale: 1, offset: { x: -128, y: -128 } });
  }, []);

  return (
    <Canvas ref={canvasRef}>
      <Grid showAxes />
      <Rope />
    </Canvas>
  );
};

// TODO(burdon): Create <spring /> elements with common simulation.
const Rope = () => {
  const { styles } = useCanvasContext();
  useWheel();

  const g = useRef<SVGGElement>(null);
  const elements = useMemo(() => {
    return [
      {
        id: 's1',
        start: { x: -128, y: 0 },
        end: { x: 128, y: 0 },
      },
      {
        id: 's2',
        start: { x: 256, y: 0 },
        end: { x: 320, y: 0 },
      },
      {
        id: 's3',
        start: { x: -256, y: 0 },
      },
    ];
  }, []);
  useRope(g.current, elements, { nodes: 7, ropeLength: 200, linkStrength: 0.1, gravity: 0.95, curve: true });

  return (
    <div className='absolute' style={styles}>
      <svg className='absolute overflow-visible'>
        <g ref={g} />
      </svg>
    </div>
  );
};

const meta: Meta = {
  title: 'ui/react-ui-canvas-editor/Path',
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {};

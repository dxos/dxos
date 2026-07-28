//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Sketch } from '@dxos/plugin-illustrator/types';
import { CardContainer } from '@dxos/react-ui-mosaic/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { meta as pluginMeta } from '#meta';
import { TldrawBuilder } from '#model';
import { Tldraw } from '#types';

import { TldrawCard } from './TldrawCard';

const CardStory = () => {
  const { sketch, canvas } = useMemo(() => {
    const canvas = Tldraw.makeCanvas({
      content: new TldrawBuilder()
        .rectangle({ id: 'a', x: 0, y: 0, text: 'DXOS', color: 'blue', fill: 'solid' })
        .ellipse({ id: 'b', x: 360, y: 0, text: 'ECHO', color: 'green' })
        .geo('star', { id: 'c', x: 180, y: 280, text: 'EDGE', color: 'yellow' })
        .arrow({ from: 'a', to: 'b' })
        .arrow({ from: 'b', to: 'c' })
        .build(),
    });
    return { sketch: Sketch.make({ canvas }), canvas };
  }, []);

  return (
    <CardContainer role='popover' icon={pluginMeta.profile.icon?.key}>
      <TldrawCard role='card--content' sketch={sketch} canvas={canvas} />
    </CardContainer>
  );
};

const meta = {
  title: 'plugins/plugin-tldraw/containers/TldrawCard',
  render: () => <CardStory />,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['cards'],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Popover: Story = {};

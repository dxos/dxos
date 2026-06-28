//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { CardContainer } from '@dxos/react-ui-mosaic/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { meta as pluginMeta } from '#meta';
import { SketchBuilder } from '#testing';
import { Sketch } from '#types';

import { SketchCard } from './SketchCard';

const CardStory = () => {
  const subject = useMemo(
    () =>
      Sketch.make({
        canvas: {
          content: new SketchBuilder()
            .rectangle({ id: 'a', x: 0, y: 0, text: 'DXOS', color: 'blue', fill: 'solid' })
            .ellipse({ id: 'b', x: 360, y: 0, text: 'ECHO', color: 'green' })
            .geo('star', { id: 'c', x: 180, y: 280, text: 'EDGE', color: 'yellow' })
            .arrow({ from: 'a', to: 'b' })
            .arrow({ from: 'b', to: 'c' })
            .build(),
        },
      }),
    [],
  );

  return (
    <CardContainer role='popover' icon={pluginMeta.profile.icon?.key}>
      <SketchCard role='card--content' subject={subject} />
    </CardContainer>
  );
};

const meta = {
  title: 'plugins/plugin-sketch/containers/SketchCard',
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

//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { OperationPlugin, RuntimePlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client';
import { Markdown } from '@dxos/plugin-markdown/types';
import { faker } from '@dxos/random';
import { Card } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { CardContainer } from '@dxos/react-ui-mosaic/testing';

import { translations } from '../../translations';

import { MarkdownCard, type MarkdownCardProps } from './MarkdownCard';

faker.seed(1234);

const MarkdownCardStory = ({ ...args }: Omit<MarkdownCardProps, 'subject'>) => {
  const subject = useMemo(
    () =>
      Markdown.make({
        name: faker.lorem.words(3),
        content: faker.lorem.paragraphs(5),
      }),
    [],
  );

  return (
    <CardContainer icon='ph--text-aa--regular'>
      <Card.Root border={false}>
        <Card.Toolbar>
          <Card.DragHandle />
          <Card.Title>{Obj.getLabel(subject)}</Card.Title>
          <Card.Menu />
        </Card.Toolbar>
        <MarkdownCard subject={subject} {...args} />
      </Card.Root>
    </CardContainer>
  );
};

const meta: Meta<typeof MarkdownCardStory> = {
  title: 'plugins/plugin-markdown/containers/MarkdownCard',
  component: MarkdownCardStory,
  decorators: [
    withTheme(),
    withPluginManager({
      plugins: [OperationPlugin(), RuntimePlugin(), ClientPlugin({})],
    }),
  ],
  parameters: {
    layout: 'centered',
    translations,
  },
  tags: ['cards'],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

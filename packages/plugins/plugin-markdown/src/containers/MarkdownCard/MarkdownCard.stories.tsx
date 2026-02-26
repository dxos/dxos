//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { OperationPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Markdown } from '@dxos/plugin-markdown/types';
import { faker } from '@dxos/random';
import { withTheme } from '@dxos/react-ui/testing';
import { CardContainer } from '@dxos/react-ui-mosaic/testing';

import { translations } from '../../translations';

import { MarkdownCard, type MarkdownCardProps } from './MarkdownCard';

faker.seed(1234);

// TODO(wittjosiah): ECHO objects don't work when passed via Storybook args.
const MarkdownCardStory = ({ ...args }: Omit<MarkdownCardProps, 'subject'>) => {
  const subject = useMemo(
    () =>
      Markdown.make({
        name: faker.lorem.words(3),
        content: faker.lorem.paragraphs(3),
      }),
    [],
  );
  return (
    <CardContainer icon='ph--text-aa--regular'>
      <MarkdownCard subject={subject} {...args} />
    </CardContainer>
  );
};

const meta: Meta<typeof MarkdownCardStory> = {
  title: 'plugins/plugin-markdown/Card',
  component: MarkdownCardStory,
  decorators: [
    withTheme(),
    withPluginManager({
      plugins: [OperationPlugin()],
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

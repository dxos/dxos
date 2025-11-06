//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Markdown } from '@dxos/plugin-markdown/types';
import { faker } from '@dxos/random';
import { withTheme } from '@dxos/react-ui/testing';
import { CardContainer } from '@dxos/react-ui-stack/testing';

import { translations } from '../../translations';

import { MarkdownCard } from './MarkdownCard';

faker.seed(1234);

const meta: Meta<typeof MarkdownCard> = {
  title: 'plugins/plugin-markdown/Card',
  component: MarkdownCard,
  render: ({ role, subject, ...args }) => {
    return (
      <CardContainer icon='ph--text-aa--regular' role={role}>
        <MarkdownCard role={role} subject={subject} {...args} />
      </CardContainer>
    );
  },
  decorators: [
    withTheme,
    withPluginManager({
      plugins: [IntentPlugin()],
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

export const Popover: Story = {
  args: {
    role: 'card--popover',
    subject: Markdown.make({
      name: faker.lorem.words(3),
      content: faker.lorem.paragraphs(3),
    }),
  },
};

export const Intrinsic: Story = {
  args: {
    role: 'card--intrinsic',
    subject: Markdown.make({
      name: faker.lorem.words(3),
      content: faker.lorem.paragraphs(3),
    }),
  },
};

export const Extrinsic: Story = {
  args: {
    role: 'card--extrinsic',
    subject: Markdown.make({
      name: faker.lorem.words(3),
      content: faker.lorem.paragraphs(3),
    }),
  },
};

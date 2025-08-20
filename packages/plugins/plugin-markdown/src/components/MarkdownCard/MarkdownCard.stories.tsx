//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Markdown } from '@dxos/plugin-markdown/types';
import { faker } from '@dxos/random';
import { CardContainer } from '@dxos/react-ui-stack/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

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
    withPluginManager({
      plugins: [IntentPlugin()],
    }),
    withTheme,
    withLayout(),
  ],
  parameters: {
    layout: 'centered',
    translations,
  },
  tags: ['cards'],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Popover = {
  args: {
    role: 'card--popover',
    subject: Markdown.makeDocument({
      name: faker.lorem.words(3),
      content: faker.lorem.paragraphs(3),
    }),
  },
} satisfies Story;

export const Intrinsic = {
  args: {
    role: 'card--intrinsic',
    subject: Markdown.makeDocument({
      name: faker.lorem.words(3),
      content: faker.lorem.paragraphs(3),
    }),
  },
} satisfies Story;

export const Extrinsic = {
  args: {
    role: 'card--extrinsic',
    subject: Markdown.makeDocument({
      name: faker.lorem.words(3),
      content: faker.lorem.paragraphs(3),
    }),
  },
} satisfies Story;

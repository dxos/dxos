//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { Card } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { GitHubCard } from '../cards';
import { createIssue, createPullRequest } from './fixtures';

const subjects = { issue: createIssue, pull: createPullRequest };

type StoryArgs = {
  kind: keyof typeof subjects;
};

/** The card as the popover hosts it: the host's header carries the label, the plugin's card the body. */
const DefaultStory = ({ kind }: StoryArgs) => {
  const subject = useMemo(() => subjects[kind](), [kind]);
  return (
    <div className='dx-card-popover-width'>
      <Card.Root>
        <Card.Header>
          <Card.Title>{Obj.getLabel(subject)}</Card.Title>
        </Card.Header>
        <GitHubCard role='card--content' subject={subject} />
      </Card.Root>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-github/cards/GitHubCard',
  render: DefaultStory,
  argTypes: {
    kind: { control: 'select', options: Object.keys(subjects) },
  },
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Issue: Story = {
  args: { kind: 'issue' },
};

export const PullRequest: Story = {
  args: { kind: 'pull' },
};

//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { Card } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message } from '@dxos/types';

import { translations } from '#translations';

import { RelatedMessages } from './RelatedMessages';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** One subject long enough to truncate, so the age is visibly held clear of it. */
const SUBJECTS: [string, number][] = [
  ['Reminder: Please Review and Sign Your Tax Return Documents Before the Deadline', 30_000],
  ['Quarterly planning sync', 45 * MINUTE],
  ['Re: Contract redlines', 5 * HOUR],
  ['Invoice #4821', 3 * DAY],
  ['Welcome aboard', 21 * DAY],
  ['Your 2024 statement', 200 * DAY],
];

const DefaultStory = () => {
  const messages = useMemo(() => {
    const now = Date.now();
    return SUBJECTS.map(([subject, age]) =>
      Obj.make(Message.Message, {
        created: new Date(now - age).toISOString(),
        sender: { email: 'noreply@safesendreturns.com', name: 'Citrin Cooperman Advisors LLC' },
        blocks: [],
        properties: { subject },
      }),
    );
  }, []);

  return (
    <Card.Root fullWidth>
      <Card.Header>
        <Card.Title>Citrin Cooperman Advisors LLC</Card.Title>
      </Card.Header>
      <Card.Body>
        <RelatedMessages messages={messages} onMessageClick={() => {}} />
      </Card.Body>
    </Card.Root>
  );
};

const meta = {
  title: 'plugins/plugin-inbox/components/RelatedMessages',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Ages span every unit the row can show, newest first.
 *
 * Test:
 * 1. Each row ends with a short age — `now`, `45m`, `5h`, `3d`, `3w`, `6mo` — reading down.
 * 2. The first subject is long enough to truncate; its age stays fully visible at the right,
 *    between the subject and the arrow.
 */
export const Default: Story = {};

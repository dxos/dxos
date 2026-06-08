//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { random } from '@dxos/random';
import { createObject } from '@dxos/react-client/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Event as EventType } from '@dxos/types';

import { translations } from '#translations';

import { Event } from './Event';

const DefaultStory = () => {
  const event = useMemo(
    () =>
      EventType.make({
        title: random.lorem.sentence(5),
        description: random.lorem.paragraph(2),
        owner: {},
        attendees: Array.from({ length: 3 }, () => ({
          name: random.person.fullName(),
          email: random.internet.email(),
        })),
        startDate: new Date('2025-11-19T12:00:00').toISOString(),
        endDate: new Date('2025-11-19T13:00:00').toISOString(),
      }),
    [],
  );

  return (
    <Event.Root event={event}>
      <Event.Toolbar alwaysActive />
      <Event.Header />
      <Event.Viewport>
        <Event.Body />
      </Event.Viewport>
    </Event.Root>
  );
};

// Editable form (as used for draft events). `createObject` yields a live, reactive ECHO object so the
// `useObject`-bound inputs and the markdown body editor (createDocAccessor) work in the story.
const EditableStory = () => {
  const event = useMemo(
    () =>
      createObject(
        EventType.make({
          title: random.lorem.sentence(5),
          description: '',
          owner: {},
          attendees: Array.from({ length: 2 }, () => ({
            name: random.person.fullName(),
            email: random.internet.email(),
          })),
          startDate: new Date('2025-11-19T12:00:00').toISOString(),
          endDate: new Date('2025-11-19T13:00:00').toISOString(),
        }),
      ),
    [],
  );

  return (
    <Event.Root event={event}>
      <Event.Toolbar alwaysActive onSave={() => {}} onDelete={() => {}} />
      <Event.Header editable />
      <Event.Viewport>
        <Event.Body editable />
      </Event.Viewport>
    </Event.Root>
  );
};

const meta = {
  title: 'plugins/plugin-inbox/components/Event',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Editable: Story = { render: EditableStory };

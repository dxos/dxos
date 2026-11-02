//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { getSpeakerLines } from '../../markdown/notes.ts';
import { SpeakerNotes } from './SpeakerNotes.tsx';

const NOTES = `
- Enterprise data has been siloed for decades; this was a consequence of SaaS software economics.
- But agents need a unified view across the organization to be effective.
- And this demands a new data and security model.
`;

const NEXT = `
- Today, agents access our data through point-to-point connections with broad permissions.
`;

const meta: Meta = {
  title: 'plugins/plugin-presenter/components/SpeakerNotes',
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { translations },
};

export default meta;

type Story = StoryObj;

export const Prompter: Story = {
  render: () => (
    <SpeakerNotes.Prompter
      title='The Silo Problem'
      lines={getSpeakerLines(NOTES)}
      next={{ title: 'Monolithic Agents', lines: getSpeakerLines(NEXT) }}
      index={0}
      count={6}
      elapsed={9}
      duration={15}
    />
  ),
};

export const Subtitles: Story = {
  render: () => (
    <div className='relative h-full bg-black'>
      <SpeakerNotes.Subtitles lines={getSpeakerLines(NOTES).slice(0, 2)} />
    </div>
  ),
};

export const Test: Story = {
  render: () => (
    <SpeakerNotes.Prompter
      title='The Silo Problem'
      lines={getSpeakerLines(NOTES)}
      index={2}
      count={6}
      elapsed={20}
      duration={15}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 1. One line per sentence of the notes.
    await expect(
      canvas.getByText('But agents need a unified view across the organization to be effective.'),
    ).toBeVisible();
    // 2. Time past the slide's desired length is flagged.
    const time = canvas.getByTestId('presenter.prompter.time');
    await expect(time).toHaveTextContent('0:20 / 0:15');
    await expect(time.getAttribute('data-over')).toBe('true');
  },
};

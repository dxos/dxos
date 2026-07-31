//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Html } from './Html';
import { Compare, EMAIL_SAMPLES, SampleFrame } from './testing';
import { emailDialect } from './transform-email';

//
// The email dialect. Every story here is a light/dark comparison, because that is the judgement the
// policy exists to make: which bodies to recolor, which to leave as authored, and which the sender has
// already told us not to touch. The sandbox's own guarantees are covered in `Html.stories.tsx`.
//

type SampleId = keyof typeof EMAIL_SAMPLES;

type StoryProps = {
  sample: SampleId;
  /** Forces the recolor path that table layouts otherwise skip — how bulk mail would look if themed. */
  isPersonal?: boolean;
  loadRemoteImages?: boolean;
  /** Off for judging a single rendering in the storybook theme; on to see both at once. */
  compare?: boolean;
};

const DefaultStory = ({ sample, isPersonal, loadRemoteImages, compare }: StoryProps) => {
  const { html, note } = EMAIL_SAMPLES[sample];
  const body = () => <Html html={html} loadRemoteImages={loadRemoteImages} dialect={emailDialect({ isPersonal })} />;
  return <SampleFrame note={note}>{compare ? <Compare render={body} /> : body()}</SampleFrame>;
};

const meta = {
  title: 'ui/react-ui-components/Html/email',
  component: DefaultStory,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    sample: { control: 'select', options: Object.keys(EMAIL_SAMPLES) },
  },
  args: { sample: 'personal', compare: true },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** No tables and flagged personal: recolored to the app ink in both modes. */
export const Personal: Story = {
  args: {
    sample: 'personal',
    isPersonal: true,
  },
};

/** Quoted history collapsed behind the "•••" toggle; the open state survives a theme change. */
export const Reply: Story = {
  args: {
    sample: 'reply',
    isPersonal: true,
  },
};

/** Table layout, not personal: left as authored, on a light sheet in dark mode. */
export const Marketing: Story = {
  args: {
    sample: 'marketing',
  },
};

/** The same table body flagged personal — recolored anyway, which is the trade the flag buys. */
export const MarketingThemed: Story = {
  args: {
    sample: 'marketing',
    isPersonal: true,
  },
};

/** Real mail: a table layout that declares nothing, so it takes the heuristic. */
export const CapturedUndeclared: Story = {
  args: { sample: 'm1' },
};

/**
 * Real mail declaring `color-scheme: light` — the sender stating it has no dark rendering. The dark pane
 * must show the light sheet, not a recolor: an explicit declaration outranks our heuristic.
 */
export const CapturedLightOnly: Story = { args: { sample: 'm2' } };

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

type StoryArgs = {
  sample: SampleId;
  loadRemoteImages?: boolean;
  /** Off for judging a single rendering in the storybook theme; on to see both at once. */
  compare?: boolean;
};

const DefaultStory = ({ sample, loadRemoteImages, compare }: StoryArgs) => {
  const { html, note } = EMAIL_SAMPLES[sample];
  const body = () => <Html html={html} loadRemoteImages={loadRemoteImages} dialect={emailDialect()} />;
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

/** A simple body with no declaration: recolored to the app ink in both modes. */
export const Personal: Story = {
  args: {
    sample: 'personal',
  },
};

/** Quoted history collapsed behind the toggle; the open state survives a theme change. */
export const Reply: Story = {
  args: {
    sample: 'reply',
  },
};

/**
 * A call-to-action on a painted background must keep the label its author chose — the accent override
 * would otherwise put the app blue on the button's own blue. The plain link beside it still takes the
 * accent, since nothing is painted behind it.
 */
export const Button: Story = {
  args: {
    sample: 'button',
  },
};

/** A table layout that declares nothing — recolored like any other undeclared body since the layout
 * exemption was dropped. Authored colored backgrounds (header, button) survive; only light ones go. */
export const Marketing: Story = {
  args: {
    sample: 'marketing',
  },
};

/** Real mail, undeclared: the case that motivated dropping the layout exemption. */
export const Example1: Story = {
  args: {
    sample: 'm1',
  },
};

/**
 * Real mail declaring `color-scheme: light`. The declaration says the sender has no dark design of its
 * own — not that ours is unwelcome — so this is recolored like anything else. Both panes must differ.
 */
export const Example2: Story = {
  args: {
    sample: 'm2',
  },
};

/**
 * Real mail declaring `color-scheme: light dark` *and* shipping its own `@media (prefers-color-scheme:
 * dark)` rules — the one case that would be exempt from recoloring, if those rules survived. They do
 * not: sanitization strips the `<style>` blocks carrying them (DESIGN.md Gap A), so
 * `applyAuthoredDarkRules` finds nothing and the body falls through to the recolor rather than
 * rendering light inside a dark app. Both panes must differ; when Gap A is closed this story is what
 * should switch to the sender's own dark design.
 */
export const Example3: Story = {
  args: {
    sample: 'm3',
  },
};

//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { type SourceKey } from '#sync';
import { translations } from '#translations';

import CODE_REVIEW from '../../../PLUGIN.review.mdl?raw';
import { parseReview, walkthroughOf } from '../SpecModel/index.ts';
import { Walkthrough } from './Walkthrough.tsx';

/** This file's directory in the repo, which the glob's keys are relative to. */
const STORY_DIR = 'packages/plugins/plugin-code/src/components/VerdictCard/';

/** plugin-code's sources as the checkout would serve them, keyed by repo path. */
const SOURCES: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('../../**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  ).map(([file, text]) => [new URL(file, `file:///${STORY_DIR}`).pathname.slice(1), text]),
);

const read = ({ path }: SourceKey) => SOURCES[path];

/** plugin-code's own review: the first verdict whose walkthrough the reviewer wrote. */
const STEPS =
  parseReview(CODE_REVIEW)
    .verdicts.filter((verdict) => verdict.walkthrough.length > 0)
    .map(walkthroughOf)
    .find((steps) => steps !== undefined) ?? [];

const meta = {
  title: 'plugins/plugin-code/components/Walkthrough',
  component: Walkthrough,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-card-default-width p-4' })],
  parameters: { translations: [...translations, ...reactUiTranslations] },
  args: { steps: STEPS, read, onOpenCode: () => {} },
} satisfies Meta<typeof Walkthrough>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A reviewer's walkthrough: each step's sentence above the declaration it names, linked to its file. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const steps = canvas.getAllByTestId('verdict-card.walkthrough-step');
    await expect(steps.length).toBe(STEPS.length);
    await expect(steps.length).toBeGreaterThan(1);
    await expect(steps[0].textContent).toContain(`1. ${STEPS[0].text}.`);
    // Every step names a plugin-code declaration, so each shows its code.
    await expect(canvas.getAllByTestId('spec-review.snippet')).toHaveLength(STEPS.length);
  },
};

/** No checkout: each step keeps its sentence and file link, with no code under it. */
export const NoCheckout: Story = {
  args: { read: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByTestId('verdict-card.walkthrough-step').length).toBe(STEPS.length);
    await expect(canvas.queryAllByTestId('spec-review.snippet')).toHaveLength(0);
  },
};

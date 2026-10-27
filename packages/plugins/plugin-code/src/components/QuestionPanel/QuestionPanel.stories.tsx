//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { translations as taskTranslations } from '@dxos/react-ui-task/translations';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import FEEDS_MDL from '../../../../../core/echo/echo/docs/FEEDS.mdl?raw';
import { QuestionPanel } from './QuestionPanel.tsx';

const meta = {
  title: 'plugins/plugin-code/components/QuestionPanel',
  component: QuestionPanel,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-(--dx-complementary-sidebar-size)' })],
  parameters: { translations: [...translations, ...taskTranslations, ...reactUiTranslations] },
} satisfies Meta<typeof QuestionPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

// A fixed spec, so the assertions do not depend on which questions a living spec still has open.
const SPEC = [
  '# Spec',
  '',
  '```mdl',
  'question Q-1: Which store holds the head?',
  '  to: user:alice',
  '  status: open',
  '  options:',
  '    - The branches table.',
  '    - The blocks table.',
  '```',
  '',
  '```mdl',
  'question Q-2: How does sync carry the fork flag?',
  '  status: answered',
  '  answer: |',
  '    As an optional field of the block.',
  '  decisions: [D-51]',
  '```',
  '',
].join('\n');

/** Open questions first, answered ones with their answer and decisions. */
export const Default: Story = {
  args: { content: SPEC, onReveal: fn(), onSelectDecision: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const cards = await waitFor(() => canvas.getAllByTestId('spec-question-card'));
    await expect(cards[0].dataset.status).toBe('open');
    const answered = cards.find((card) => card.dataset.question === 'Q-2');
    await expect(answered?.dataset.status).toBe('answered');
    const chip = within(answered ?? canvasElement).getByTestId('spec-question-card.decision');
    await userEvent.click(chip);
    await expect(args.onSelectDecision).toHaveBeenCalledWith('D-51');
    await userEvent.click(within(cards[0]).getByTestId('spec-question-card.reveal'));
    await expect(args.onReveal).toHaveBeenCalledWith(cards[0].dataset.question);
  },
};

/** The questions of the feeds spec. */
export const Feeds: Story = {
  args: { content: FEEDS_MDL, onReveal: fn(), onSelectDecision: fn() },
};

/** A spec with no questions. */
export const Empty: Story = {
  args: { content: '# Spec\n\nNo questions here.\n' },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByTestId('question-panel.empty')).toBeTruthy();
  },
};

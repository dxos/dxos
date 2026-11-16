//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import CANVAS_AUTOGROW_SPEC from '../DecisionModel/__fixtures__/canvas-autogrow.mdl?raw';
import { DecisionCursor } from './DecisionCursor.tsx';

const meta = {
  title: 'plugins/plugin-projects/components/DecisionCursor',
  component: DecisionCursor,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'column' })],
  parameters: { translations: [...translations, ...reactUiTranslations] },
} satisfies Meta<typeof DecisionCursor>;

export default meta;

type Story = StoryObj<typeof meta>;

const cursorOn = (fragment: string) => CANVAS_AUTOGROW_SPEC.indexOf(fragment) + 2;

/** The cursor on a requirement: what holds on it, with what fills it in, then what holds on its feature. */
export const Item: Story = {
  args: { content: CANVAS_AUTOGROW_SPEC, cursor: cursorOn('req F-2.1'), onApprove: fn(), onOpenLedger: fn() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByTestId('decision-cursor')).toHaveAttribute('data-focus', 'F-2.1'));
    await expect(canvas.getByTestId('decision-cursor.here')).toBeVisible();
  },
};

/** The spec with one agent decision on F-2.1 that nobody has approved yet. */
const UNAPPROVED_SPEC = [
  CANVAS_AUTOGROW_SPEC,
  '```mdl',
  'decision D-13: Bounds grow by whole cells. Fills in [D-1].',
  '  date: 2026-10-10',
  '  by: agent:claude-code',
  '  for: user:alice',
  '  affects: [F-2.1]',
  '```',
  '',
].join('\n');

/** The cursor offers Approve on a decision that holds and awaits approval, and on no other. */
export const Approve: Story = {
  args: {
    content: UNAPPROVED_SPEC,
    cursor: UNAPPROVED_SPEC.indexOf('req F-2.1') + 2,
    onApprove: fn(),
    onOpenLedger: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByTestId('decision-cursor')).toHaveAttribute('data-focus', 'F-2.1'));
    // D-3, replaced by D-8, is shown on F-2.1 too, but holds no longer.
    await expect(canvas.getByTestId('decision-cursor').textContent).toContain('D-3');
    const [approve, ...rest] = canvas.getAllByTestId('decision.approve');
    await expect(rest).toHaveLength(0);
    await userEvent.click(approve);
    await expect(args.onApprove).toHaveBeenCalledWith(['D-13']);
  },
};

/** The cursor on a feature: the decisions on its requirements, a row each. */
export const Block: Story = {
  args: { content: CANVAS_AUTOGROW_SPEC, cursor: cursorOn('feat F-2'), onOpenLedger: fn() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByTestId('decision-cursor.within')).toBeVisible());
  },
};

/** The cursor on a decision in the changelog: that decision, and a way into its thread. */
export const Decision: Story = {
  args: { content: CANVAS_AUTOGROW_SPEC, cursor: cursorOn('decision D-3'), onOpenLedger: fn() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByTestId('decision-cursor.open-ledger')).toBeVisible());
  },
};

/** The cursor on an approval: the decisions it approves, which the ledger shows it on. */
export const Approval: Story = {
  args: { content: CANVAS_AUTOGROW_SPEC, cursor: cursorOn('decision D-7'), onOpenLedger: fn() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(
        canvas.getAllByTestId('decision-card.decision').map((decision) => decision.getAttribute('data-decision')),
      ).toEqual(['D-2', 'D-5', 'D-6']),
    );
  },
};

/** The cursor on a question: the question, with its answer. */
export const Question: Story = {
  args: { content: CANVAS_AUTOGROW_SPEC, cursor: cursorOn('question Q-1'), onOpenLedger: fn() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByTestId('decision-ledger.question')).toHaveAttribute('data-question', 'Q-1'));
  },
};

/** No cursor yet. */
export const Empty: Story = {
  args: { content: CANVAS_AUTOGROW_SPEC },
};

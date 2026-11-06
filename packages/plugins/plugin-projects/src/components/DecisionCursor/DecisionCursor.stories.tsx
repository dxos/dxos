//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor, within } from 'storybook/test';

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

/** No cursor yet. */
export const Empty: Story = {
  args: { content: CANVAS_AUTOGROW_SPEC },
};

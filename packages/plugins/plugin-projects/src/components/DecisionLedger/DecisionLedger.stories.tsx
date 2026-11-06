//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import CODE_SPEC from '../../../../plugin-code/PLUGIN.mdl?raw';
import CANVAS_AUTOGROW_SPEC from '../DecisionModel/__fixtures__/canvas-autogrow.mdl?raw';
import { approveDecisions } from '../DecisionModel/index.ts';
import { DecisionLedger, type DecisionLedgerProps } from './DecisionLedger.tsx';

/** Holds the spec's text and appends each approval to it, as the panel does through the editor. */
const ApprovingLedger = ({ content: initial, ...props }: DecisionLedgerProps) => {
  const [content, setContent] = useState(initial);
  return (
    <DecisionLedger
      {...props}
      content={content}
      onApprove={(ids) => {
        props.onApprove?.(ids);
        const edit = approveDecisions(content, { ids, by: 'user:alice', date: '2026-10-10' });
        if (edit) {
          setContent(content.slice(0, edit.from) + edit.insert + content.slice(edit.to));
        }
      }}
    />
  );
};

const meta = {
  title: 'plugins/plugin-projects/components/DecisionLedger',
  component: DecisionLedger,
  render: (args) => <ApprovingLedger {...args} />,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'column' })],
  parameters: { translations: [...translations, ...reactUiTranslations] },
} satisfies Meta<typeof DecisionLedger>;

export default meta;

type Story = StoryObj<typeof meta>;

/** One direction, the agent's design filling it in, and the person's approvals: a block opens its threads, and a thread its days. */
export const Default: Story = {
  args: { content: CANVAS_AUTOGROW_SPEC, onApprove: fn(), onAnswer: fn() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [block] = await waitFor(() => canvas.getAllByTestId('decision-ledger.block'));
    await userEvent.click(block);
    const [thread] = await waitFor(() => canvas.getAllByTestId('decision-ledger.thread'));
    await userEvent.click(thread);
    await waitFor(() => expect(canvas.getByTestId('decision-ledger')).toHaveAttribute('data-level', 'thread'));
    await expect(canvas.getByTestId('decision-ledger.holds-now')).toBeVisible();
  },
};

/** plugin-code's own changelog: approving everything at the top level records one decision, after which nothing awaits approval. */
export const ApproveAll: Story = {
  args: { content: CODE_SPEC, onApprove: fn(), onAnswer: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('decision-ledger.approve-all'));
    await userEvent.click(await within(document.body).findByTestId('decision-ledger.confirm.approve'));
    await waitFor(() => expect(args.onApprove).toHaveBeenCalledOnce());
    await waitFor(() => expect(canvas.queryByTestId('decision-ledger.unapproved')).toBeNull());
  },
};

/** plugin-code's own changelog, with one decision selected as a margin chip selects it: the ledger opens its thread. */
export const Selected: Story = {
  args: { content: CODE_SPEC, selected: 'D-93' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByTestId('decision-ledger')).toHaveAttribute('data-level', 'thread'));
    await expect(canvasElement.querySelector('[data-decision="D-93"]')).not.toBeNull();
  },
};

/** Read-only: no approve actions anywhere. */
export const ReadOnly: Story = {
  args: { content: CANVAS_AUTOGROW_SPEC },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findAllByTestId('decision-ledger.block');
    await expect(canvas.queryAllByTestId('decision.approve')).toHaveLength(0);
  },
};

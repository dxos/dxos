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

/** Selects decisions as a margin chip does, clearing the selection once the ledger follows it, as the panel does. */
const SelectingLedger = (props: DecisionLedgerProps) => {
  const [selected, setSelected] = useState<string>();
  return (
    <>
      {['Q-1', 'D-3'].map((id) => (
        <button key={id} type='button' onClick={() => setSelected(id)} data-testid={`select.${id}`}>
          {id}
        </button>
      ))}
      <DecisionLedger {...props} selected={selected} onFollow={() => setSelected(undefined)} />
    </>
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

/** A margin chip clicked again after the reader moved away opens the thread again, even from the question list. */
export const SelectAgain: Story = {
  args: { content: CANVAS_AUTOGROW_SPEC },
  render: (args) => <SelectingLedger {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const level = () => canvas.getByTestId('decision-ledger').getAttribute('data-level');
    await userEvent.click(await canvas.findByTestId('select.D-3'));
    await waitFor(() => expect(level()).toBe('thread'));
    await userEvent.click(within(canvas.getByTestId('decision-ledger.trail')).getAllByRole('button')[0]);
    await waitFor(() => expect(level()).toBe('spec'));
    await userEvent.click(canvas.getByTestId('select.D-3'));
    await waitFor(() => expect(level()).toBe('thread'));
    await userEvent.click(canvas.getByTestId('select.Q-1'));
    await waitFor(() => expect(canvas.queryAllByTestId('decision-ledger.thread')).toHaveLength(0));
    await userEvent.click(canvas.getByTestId('select.D-3'));
    await waitFor(() => expect(canvas.getByTestId('decision-ledger.holds-now')).toBeVisible());
  },
};

/** A filtered ledger approves only the decisions its filter shows. */
/** Two agent decisions mention a hint, and one of them shares a thread with one that does not. */
const HINT_SPEC = [
  '# Lists',
  '',
  '## Changelog',
  '',
  ...[
    ['D-1', 'Lists are sorted.', ['by: user:alice', 'affects: [F-1]']],
    ['D-2', 'Sorting ignores case. Fills in [D-1].', ['by: agent:claude-code', 'for: user:alice', 'affects: [F-1]']],
    [
      'D-3',
      'A sorted list shows a hint. Fills in [D-2].',
      ['by: agent:claude-code', 'for: user:alice', 'affects: [F-1]'],
    ],
    ['D-4', 'Empty lists show a hint.', ['by: agent:claude-code', 'for: user:alice', 'affects: [F-2]']],
  ].flatMap(([id, title, fields]) => [
    '```mdl',
    `decision ${id}: ${title}`,
    '  date: 2026-10-02',
    ...(fields as string[]).map((field) => `  ${field}`),
    '```',
    '',
  ]),
].join('\n');

export const ApproveFiltered: Story = {
  args: { content: HINT_SPEC, onApprove: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByTestId('decision-ledger.search'), 'hint');
    await userEvent.click(await canvas.findByTestId('decision-ledger.approve-all'));
    await userEvent.click(await within(document.body).findByTestId('decision-ledger.confirm.approve'));
    await waitFor(() => expect(args.onApprove).toHaveBeenCalledWith(['D-3', 'D-4']));
  },
};

/** A block and a thread offer, on their banners, cards and rows, only the decisions the filter shows. */
export const ApproveFilteredBlock: Story = {
  args: { content: HINT_SPEC, onApprove: fn() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const level = () => canvas.getByTestId('decision-ledger').getAttribute('data-level');
    const offered = () =>
      canvas.queryAllByTestId('decision.approve').flatMap((button) => button.dataset.ids!.split(' '));
    await userEvent.type(await canvas.findByTestId('decision-ledger.search'), 'hint');
    const blocks = await canvas.findAllByTestId('decision-ledger.block');
    await userEvent.click(blocks.find((block) => block.dataset.block === 'F-1')!);
    const [thread] = await canvas.findAllByTestId('decision-ledger.thread');
    await expect(offered().length).toBeGreaterThan(0);
    await expect(offered().filter((id) => id !== 'D-3')).toEqual([]);
    await userEvent.click(thread);
    await waitFor(() => expect(level()).toBe('thread'));
    await expect(offered().length).toBeGreaterThan(0);
    await expect(offered().filter((id) => id !== 'D-3')).toEqual([]);
  },
};

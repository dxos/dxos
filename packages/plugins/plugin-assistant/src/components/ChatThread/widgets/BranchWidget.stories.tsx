//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { MessageThreadContext } from '../sync';
import { BranchWidget, type BranchWidgetProps } from './BranchWidget';

const MESSAGE_ID = '01JQ0000000000000000000001';

const onRewind = fn();

const baseWidgetProps = {
  _tag: 'branch',
  range: { from: 0, to: 1 },
} satisfies Pick<BranchWidgetProps, '_tag' | 'range'>;

const meta = {
  title: 'plugins/plugin-assistant/components/ChatWidgets/BranchWidget',
  component: BranchWidget,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof BranchWidget>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    ...baseWidgetProps,
    messageId: MESSAGE_ID,
    created: '2026-07-29T14:32:00.000Z',
    context: new MessageThreadContext(),
  },
};

/** No timestamp: the toolbar still offers the rewind action. */
export const NoTimestamp: Story = {
  args: {
    ...baseWidgetProps,
    messageId: MESSAGE_ID,
    context: new MessageThreadContext(),
  },
};

/** Without a message id there is nothing to rewind to, so the widget renders nothing. */
export const NoMessage: Story = {
  args: {
    ...baseWidgetProps,
    created: '2026-07-29T14:32:00.000Z',
    context: new MessageThreadContext(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByTestId('chat.rewind')).toBeNull();
  },
};

/** Clicking rewind reports the prompt's message id, which is what the thread soft-forks from. */
export const Clicked: Story = {
  args: {
    ...baseWidgetProps,
    messageId: MESSAGE_ID,
    created: '2026-07-29T14:32:00.000Z',
    context: new MessageThreadContext(undefined, { onRewind }),
  },
  play: async ({ canvasElement }) => {
    onRewind.mockClear();
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('chat.rewind'));
    await expect(onRewind).toHaveBeenCalledWith(MESSAGE_ID);
  },
};

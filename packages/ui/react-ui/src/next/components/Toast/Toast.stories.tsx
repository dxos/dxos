//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { translations } from '#translations';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { type Size } from '../../sizes.ts';
import { Button, Toast, Typography } from '../index.ts';

type StoryArgs = { size?: Size; duration?: number; title?: string; description?: string };

const toasts = () => [...document.querySelectorAll<HTMLElement>('[data-scope="toast"][data-part="root"]')];

/** A button declares the toast open; closing it (button, timeout or action) is reported back through `onOpenChange`. */
const DefaultStory = ({ size, duration, title, description }: StoryArgs) => {
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [retries, setRetries] = useState(0);
  return (
    <Toast.Provider>
      <div className='flex flex-col gap-2'>
        <Button onClick={() => setOpen(true)}>Show toast</Button>
        <Typography data-testid='log'>{log.join(',')}</Typography>
        <Typography data-testid='retries'>{retries}</Typography>
      </div>
      <Toast.Root
        open={open}
        duration={duration}
        onOpenChange={(next) => {
          setOpen(next);
          setLog((entries) => [...entries, next ? 'open' : 'closed']);
        }}
      >
        <Toast.Header icon='ph--warning--regular'>{title}</Toast.Header>
        <Toast.Description>{description}</Toast.Description>
        <Toast.Footer>
          <Toast.ActionTrigger onClick={() => setRetries((count) => count + 1)}>Retry</Toast.ActionTrigger>
        </Toast.Footer>
      </Toast.Root>
      <Toast.Toaster size={size} />
    </Toast.Provider>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Toast',
  render: DefaultStory,
  decorators: [withLayout({ classNames: 'p-4' }), withTheme()],
  args: {
    size: 'md',
    duration: 60_000,
    title: 'Sync failed',
    description: 'The server could not be reached; changes are kept locally.',
  },
  argTypes: { size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] } },
  parameters: { layout: 'centered', translations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The toast is labelled by its title; its action and its close button each dismiss it. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(toasts()).toHaveLength(0);
    await userEvent.click(canvas.getByRole('button', { name: 'Show toast' }));

    await waitFor(() => expect(toasts()).toHaveLength(1));
    const [toast] = toasts();
    const labelledBy = toast.getAttribute('aria-labelledby');
    await expect(labelledBy && document.getElementById(labelledBy)?.textContent).toBe('Sync failed');
    await expect(toast).toHaveAttribute('data-surface', 'popup');

    // The description and actions align under the title, past the icon track.
    const title = within(toast).getByText('Sync failed').getBoundingClientRect();
    const description = within(toast)
      .getByText(/server could not be reached/)
      .getBoundingClientRect();
    await expect(description.left).toBeCloseTo(title.left, 0);

    // A timed toast shows its countdown, hidden from assistive tech.
    await expect(toast.querySelector('[data-scope="progress"]')).toHaveAttribute('aria-hidden', 'true');

    // The action runs and dismisses the toast.
    await userEvent.click(within(toast).getByRole('button', { name: 'Retry' }));
    await expect(canvas.getByTestId('retries')).toHaveTextContent('1');
    await waitFor(() => expect(toasts()).toHaveLength(0));
    await expect(canvas.getByTestId('log')).toHaveTextContent('closed');

    // Reopened, it closes from its close button.
    await userEvent.click(canvas.getByRole('button', { name: 'Show toast' }));
    await waitFor(() => expect(toasts()).toHaveLength(1));
    await waitFor(() => expect(getComputedStyle(toasts()[0]).opacity).toBe('1'));
    await userEvent.click(within(toasts()[0]).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(toasts()).toHaveLength(0));
    await expect(canvas.getByTestId('log')).toHaveTextContent('closed,closed');
  },
};

/** A toast closes itself when its duration runs out. */
export const Timeout: Story = {
  args: { duration: 300 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Show toast' }));
    await waitFor(() => expect(toasts()).toHaveLength(1));
    await waitFor(() => expect(toasts()).toHaveLength(0), { timeout: 3_000 });
    await expect(canvas.getByTestId('log')).toHaveTextContent('closed');
  },
};

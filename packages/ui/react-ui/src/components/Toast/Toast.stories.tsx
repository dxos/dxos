//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ReactNode, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '../../testing';
import { Button } from '../Button';
import { Toast } from './Toast';

type ActionTriggerProps = { altText: string; trigger: ReactNode };

type StorybookToastProps = Partial<{
  icon: string;
  title: string;
  description: string;
  duration: number;
  actionTriggers: ActionTriggerProps[];
  openTrigger: string;
  defaultOpen: boolean;
}>;

const DefaultStory = ({
  icon,
  title,
  description,
  duration,
  actionTriggers,
  openTrigger,
  defaultOpen = true,
}: StorybookToastProps) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Toast.Provider>
      <Button onClick={() => setOpen(true)}>{openTrigger}</Button>
      <Toast.Viewport />
      <Toast.Root open={open} onOpenChange={setOpen} defaultOpen={defaultOpen} duration={duration}>
        <Toast.Title icon={icon} onClose={() => setOpen(false)}>
          {title}
        </Toast.Title>
        <Toast.Description>{description}</Toast.Description>
        {actionTriggers && actionTriggers.length > 0 && (
          <Toast.Actions>
            {actionTriggers.map(({ altText, trigger }: ActionTriggerProps, index: number) => (
              <Toast.Action key={index} altText={altText} asChild={typeof trigger !== 'string'}>
                {trigger}
              </Toast.Action>
            ))}
          </Toast.Actions>
        )}
      </Toast.Root>
    </Toast.Provider>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Toast',
  component: Toast as any,
  render: DefaultStory,
  decorators: [withTheme()],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    defaultOpen: true,
    openTrigger: 'Open toast',
    icon: 'ph--sparkle--regular',
    title: 'This is a toast',
    description: 'The bar below counts down to when this closes; it stops while the pointer is over the toast.',
    duration: 8_000,
  },
};

export const Persistent: Story = {
  args: {
    defaultOpen: true,
    openTrigger: 'Open toast',
    icon: 'ph--sparkle--regular',
    title: 'This is a toast',
    description: 'This one stays until you dismiss it, so there is no bar below.',
    duration: Infinity,
  },
};

export const WithAction: Story = {
  args: {
    defaultOpen: true,
    openTrigger: 'Open toast',
    icon: 'ph--sparkle--regular',
    title: 'This is a toast',
    description: 'The bar below counts down to when this closes; it stops while the pointer is over the toast.',
    duration: 8_000,
    actionTriggers: [
      {
        altText: 'Press F5 to reload the page',
        trigger: <Button variant='primary'>Reload</Button>,
      },
    ],
  },
};

const LifecycleStory = () => {
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    setLog((current) => [...current, next ? 'open' : 'closed']);
  };
  return (
    <Toast.Provider>
      <Button onClick={() => handleOpenChange(true)}>Show toast</Button>
      <span data-testid='log'>{log.join(',')}</span>
      <Toast.Viewport />
      <Toast.Root open={open} onOpenChange={handleOpenChange} duration={Infinity}>
        <Toast.Title icon='ph--sparkle--regular' onClose={() => handleOpenChange(false)}>
          Lifecycle toast
        </Toast.Title>
        <Toast.Description>Stays until closed.</Toast.Description>
        <Toast.Actions>
          <Toast.Action altText='Acknowledge' asChild>
            <Button variant='primary'>OK</Button>
          </Toast.Action>
        </Toast.Actions>
      </Toast.Root>
    </Toast.Provider>
  );
};

/** Opens from state, is labelled by its title, closes from its close button, and reports both changes. */
export const TestLifecycle: StoryObj = {
  render: () => <LifecycleStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const status = () => document.querySelector<HTMLElement>('[role="status"]');
    await expect(status()).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Show toast' }));
    const toast = await waitFor(async () => {
      const element = status();
      await expect(element).not.toBeNull();
      return element!;
    });
    await waitFor(async () => {
      const labelledBy = toast.getAttribute('aria-labelledby');
      await expect(labelledBy && document.getElementById(labelledBy)?.textContent).toBe('Lifecycle toast');
    });
    await expect(toast.textContent).toContain('Stays until closed.');
    await userEvent.click(within(toast).getByRole('button', { name: 'OK' }));
    await waitFor(async () => expect(status()).toBeNull());
    await expect(canvas.getByTestId('log').textContent).toBe('open,closed');
  },
};

const StackedStory = () => {
  const [toasts, setToasts] = useState<number[]>([]);
  const add = () => setToasts((current) => [...current, (current.at(-1) ?? 0) + 1]);
  const remove = (id: number) => setToasts((current) => current.filter((toast) => toast !== id));
  return (
    <Toast.Provider>
      <Button onClick={add}>Add toast</Button>
      <Toast.Viewport />
      {toasts.map((id) => (
        <Toast.Root key={id} duration={Infinity} onOpenChange={(open) => !open && remove(id)}>
          <Toast.Title icon='ph--sparkle--regular' onClose={() => remove(id)}>
            Toast {id}
          </Toast.Title>
          <Toast.Description>Each root is its own toast; they stack from the bottom.</Toast.Description>
        </Toast.Root>
      ))}
    </Toast.Provider>
  );
};

/** Every declared root is a toast of its own; open ones pile up, and the pile expands under the pointer. */
export const Stacked: StoryObj = {
  render: () => <StackedStory />,
};

export const TestStacked: StoryObj = {
  render: () => <StackedStory />,
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Add toast' });
    const roots = () => [...document.querySelectorAll<HTMLElement>('[data-scope="toast"][data-part="root"]')];
    for (let count = 1; count <= 3; count++) {
      await userEvent.click(button);
      await waitFor(async () => expect(roots()).toHaveLength(count));
    }
    // Collapsed: the ones behind the front toast are scaled down into a pile.
    await waitFor(async () => {
      const scales = roots().map((root) => parseFloat(getComputedStyle(root).scale) || 1);
      await expect(scales.filter((scale) => scale < 1)).toHaveLength(2);
    });
    // Under the pointer the pile expands into rows (newest first in the DOM), each at least a
    // toast's height apart.
    await userEvent.hover(document.querySelector<HTMLElement>('[data-scope="toast"][data-part="group"]')!);
    await waitFor(async () => {
      const tops = roots()
        .map((root) => Math.round(root.getBoundingClientRect().top))
        .sort((a, b) => a - b);
      const height = roots()[0].getBoundingClientRect().height;
      await expect(new Set(tops).size).toBe(3);
      await expect(tops[1] - tops[0]).toBeGreaterThanOrEqual(height);
      await expect(tops[2] - tops[1]).toBeGreaterThanOrEqual(height);
    });
    await userEvent.click(within(roots()[2]).getByRole('button', { name: /close/i }));
    await waitFor(async () => expect(roots()).toHaveLength(2));
  },
};

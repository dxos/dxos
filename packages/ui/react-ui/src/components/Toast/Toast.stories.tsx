//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '../../testing';
import { Button } from '../Button';
import { Toast } from './Toast';

type StoryArgs = {
  icon?: string;
  title: string;
  description: string;
  /** `Infinity` keeps the toast until it is dismissed. */
  duration: number;
  action?: string;
};

const DefaultStory = ({ icon, title, description, duration, action }: StoryArgs) => {
  const [open, setOpen] = useState(true);
  return (
    <Toast.Provider>
      <Button onClick={() => setOpen(true)}>Open toast</Button>
      <Toast.Viewport />
      <Toast.Root open={open} onOpenChange={setOpen} duration={duration}>
        <Toast.Title icon={icon} onClose={() => setOpen(false)}>
          {title}
        </Toast.Title>
        <Toast.Description>{description}</Toast.Description>
        {action && (
          <Toast.Actions>
            <Toast.Action asChild>
              <Button variant='primary'>{action}</Button>
            </Toast.Action>
          </Toast.Actions>
        )}
      </Toast.Root>
    </Toast.Provider>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Toast',
  render: DefaultStory,
  decorators: [withTheme()],
  argTypes: { duration: { control: { type: 'number' } } },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** One toast; `duration` runs the bar below it down, `Infinity` keeps it, `action` adds a button. */
export const Default: Story = {
  args: {
    icon: 'ph--sparkle--regular',
    title: 'This is a toast',
    description: 'The bar below counts down to when this closes; it stops while the pointer is over the toast.',
    duration: 8_000,
    action: 'Reload',
  },
};

//
// Stacked
//

const StackedStory = ({ overlap = true }: { overlap?: boolean }) => {
  const [toasts, setToasts] = useState<number[]>([]);
  const add = () => setToasts((current) => [...current, (current.at(-1) ?? 0) + 1]);
  const remove = (id: number) => setToasts((current) => current.filter((toast) => toast !== id));
  return (
    <Toast.Provider overlap={overlap}>
      <Button onClick={add}>Add toast</Button>
      <Toast.Viewport />
      {toasts.map((id) => (
        <Toast.Root key={id} duration={Infinity} onOpenChange={(open) => !open && remove(id)}>
          <Toast.Title icon='ph--sparkle--regular' onClose={() => remove(id)}>
            Toast {id}
          </Toast.Title>
          <Toast.Description>Each root is its own toast.</Toast.Description>
        </Toast.Root>
      ))}
    </Toast.Provider>
  );
};

/** Every declared root is a toast; `overlap` piles them (expanding under the pointer) or lays out rows. */
export const Stacked: StoryObj<{ overlap: boolean }> = {
  render: (args) => <StackedStory {...args} />,
  args: { overlap: true },
};

//
// Tests
//

const roots = () => [...document.querySelectorAll<HTMLElement>('[data-scope="toast"][data-part="root"]')];
const group = () => document.querySelector<HTMLElement>('[data-scope="toast"][data-part="group"]')!;
const closeToast = async (name: string) => {
  const target = roots().find((root) => root.textContent!.includes(name))!;
  await userEvent.click(within(target).getByRole('button', { name: /close/i }));
};
const gapsBetweenRows = () => {
  const rects = roots()
    .map((root) => root.getBoundingClientRect())
    .sort((a, b) => a.top - b.top);
  return rects.slice(1).map((rect, index) => Math.round(rect.top - rects[index].bottom));
};

/** Opens from state, is labelled by its title, closes from its action, and reports both changes. */
export const TestLifecycle: StoryObj = {
  render: () => {
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
            <Toast.Action asChild>
              <Button variant='primary'>OK</Button>
            </Toast.Action>
          </Toast.Actions>
        </Toast.Root>
      </Toast.Provider>
    );
  },
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
    await userEvent.click(within(toast).getByRole('button', { name: 'OK' }));
    await waitFor(async () => expect(status()).toBeNull());
    await expect(canvas.getByTestId('log').textContent).toBe('open,closed');
  },
};

/** The pile: siblings scaled down behind the front toast, expanding into rows under the pointer. */
export const TestPile: StoryObj = {
  render: () => <StackedStory overlap />,
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Add toast' });
    for (let count = 1; count <= 3; count++) {
      await userEvent.click(button);
      await waitFor(async () => expect(roots()).toHaveLength(count));
    }
    await waitFor(async () => {
      const scales = roots().map((root) => parseFloat(getComputedStyle(root).scale) || 1);
      await expect(scales.filter((scale) => scale < 1)).toHaveLength(2);
    });
    await userEvent.hover(group());
    await waitFor(async () => expect(gapsBetweenRows()).toEqual([8, 8]));
  },
};

/**
 * The sequence that once left a hole (seven toasts, expanded, 1, 2, 3 and 6 closed): survivors must
 * close ranks. The runner renders under StrictMode, as the dev server does, so a root whose cleanup
 * dismissed on its own — which once retired every toast the moment it appeared — fails here too.
 */
export const TestClosesRanks: StoryObj = {
  render: () => <StackedStory overlap />,
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Add toast' });
    for (let count = 1; count <= 7; count++) {
      await userEvent.click(button);
      await waitFor(async () => expect(roots()).toHaveLength(count));
    }
    await new Promise((resolve) => setTimeout(resolve, 600));
    await expect(roots().filter((root) => getComputedStyle(root).opacity === '1')).toHaveLength(7);
    await userEvent.hover(group());
    await new Promise((resolve) => setTimeout(resolve, 600));
    await closeToast('Toast 1');
    await closeToast('Toast 2');
    await closeToast('Toast 3');
    await waitFor(async () => expect(roots()).toHaveLength(4));
    await closeToast('Toast 6');
    await waitFor(async () => expect(roots()).toHaveLength(3));
    await waitFor(async () => expect(gapsBetweenRows()).toEqual([8, 8]));
  },
};

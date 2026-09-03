//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ReactNode, useState } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { withTheme } from '../../testing';
import { Button, IconButton } from '../Button';
import { DropdownMenu } from '../Menu';
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

/**
 * The layering the status bar produces: a toast is already showing when a status indicator's
 * (modal) menu opens over the same corner, so the menu's items sit underneath the toast.
 */
const OverModalMenuStory = () => (
  <Toast.Provider>
    {/* Bottom-end corner, where the status bar's indicators are; `side='left'` puts the menu over the toast. */}
    <div className='fixed bottom-2 end-2'>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <IconButton
            data-testid='story.menuTrigger'
            variant='ghost'
            icon='ph--info--regular'
            iconOnly
            label='Open status menu'
          />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content data-testid='story.menu' side='left' align='end'>
            <DropdownMenu.Viewport>
              {['One', 'Two', 'Three', 'Four', 'Five', 'Six'].map((label) => (
                <DropdownMenu.Item key={label}>
                  <span className='grow'>{label}</span>
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Viewport>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
    <Toast.Viewport />
    <Toast.Root data-testid='story.toast' open duration={100_000}>
      <Toast.Title icon='ph--sparkle--regular'>Toast over the menu</Toast.Title>
      <Toast.Description>Clicks on this toast must not reach the menu underneath it.</Toast.Description>
      <Toast.Actions>
        <Button variant='primary'>Reload</Button>
      </Toast.Actions>
    </Toast.Root>
  </Toast.Provider>
);

/** Throws rather than returning null so `waitFor` retries until the element mounts. */
const getByTestId = (testId: string): HTMLElement => {
  const element = document.querySelector(`[data-testid="${testId}"]`);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Not rendered: ${testId}`);
  }
  return element;
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
    description: 'This goes away on its own with a timer.',
    duration: 100_000,
  },
};

export const WithAction: Story = {
  args: {
    defaultOpen: true,
    openTrigger: 'Open toast',
    icon: 'ph--sparkle--regular',
    title: 'This is a toast',
    description: 'This goes away on its own with a timer.',
    duration: 100_000,
    actionTriggers: [
      {
        altText: 'Press F5 to reload the page',
        trigger: <Button variant='primary'>Reload</Button>,
      },
    ],
  },
};

/**
 * A modal menu marks every dismissable layer beneath it inert, which used to include the toast —
 * leaving it painted on top but transparent to hit-testing, so clicks fell through to the menu.
 */
export const OverModalMenu: Story = {
  render: OverModalMenuStory,
  play: async () => {
    const toast = await waitFor(() => getByTestId('story.toast'));
    // The toast slides in, so its box is only where it appears once the animation has settled.
    await waitFor(() => expect(getComputedStyle(toast).transform).toEqual('none'));

    await userEvent.click(await waitFor(() => getByTestId('story.menuTrigger')));
    const menu = await waitFor(() => getByTestId('story.menu'));

    const toastRect = toast.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const overlap = {
      left: Math.max(toastRect.left, menuRect.left),
      right: Math.min(toastRect.right, menuRect.right),
      top: Math.max(toastRect.top, menuRect.top),
      bottom: Math.min(toastRect.bottom, menuRect.bottom),
    };
    // Guards the premise: with no overlap the hit test below would prove nothing.
    await expect(overlap.right).toBeGreaterThan(overlap.left);
    await expect(overlap.bottom).toBeGreaterThan(overlap.top);

    const hit = document.elementFromPoint((overlap.left + overlap.right) / 2, (overlap.top + overlap.bottom) / 2);
    await expect(toast.contains(hit)).toBe(true);
  },
};

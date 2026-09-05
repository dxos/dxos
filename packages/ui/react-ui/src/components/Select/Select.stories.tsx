//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { random } from '@dxos/random';

import { withTheme } from '../../testing';
import { withLayoutVariants } from '../../testing';
import { Select } from './Select';

random.seed(1234);

type ItemProps = { id: string; text: string };

type StoryArgs = { items: ItemProps[] };

const DefaultStory = ({ items = [] }: StoryArgs) => {
  const [value, setValue] = useState<string>();
  return (
    <Select.Root value={value} onValueChange={setValue}>
      <Select.TriggerButton placeholder='Select value' />
      <Select.Portal>
        <Select.Content>
          <Select.Viewport>
            {items.map(({ id, text }) => (
              <Select.Option key={id} value={id}>
                {text}
              </Select.Option>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Select',
  render: DefaultStory,
  decorators: [withTheme(), withLayoutVariants()],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: Array.from({ length: 16 }).map((_, i) => ({ id: `item-${i}`, text: random.lorem.word() })),
  },
};

const TestStory = () => {
  const [value, setValue] = useState<string>('two');
  return (
    <div className='flex flex-col gap-2 p-4'>
      <Select.Root value={value} onValueChange={setValue}>
        <Select.TriggerButton placeholder='Pick one' />
        <Select.Portal>
          <Select.Content>
            <Select.Viewport>
              <Select.Option value='one'>One</Select.Option>
              <Select.Option value='two'>Two</Select.Option>
              <Select.Option value='three' disabled>
                Three
              </Select.Option>
              <Select.Option value='four'>Four</Select.Option>
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      <span data-testid='picked'>{value}</span>
    </div>
  );
};

/** Shows the selected option's label, opens on click, selects by pointer and by keyboard. */
export const TestSelect: StoryObj = {
  render: () => <TestStory />,
  play: async ({ canvasElement }) => {
    // The layout-variants decorator renders the story more than once; the first copy is exercised.
    const canvas = within(canvasElement);
    const trigger = canvas.getAllByRole('combobox')[0];
    const picked = () => canvas.getAllByTestId('picked')[0];
    await waitFor(async () => expect(trigger.textContent).toContain('Two'));
    await userEvent.click(trigger);
    const listbox = await waitFor(async () => {
      const element = document.querySelector<HTMLElement>('[role="listbox"]:not([hidden])');
      await expect(element).not.toBeNull();
      return element!;
    });
    await expect(within(listbox).getAllByRole('option').length).toBe(4);
    await userEvent.click(within(listbox).getByRole('option', { name: 'Four' }));
    await waitFor(async () => expect(picked().textContent).toBe('four'));
    await waitFor(async () => expect(document.querySelector('[role="listbox"]:not([hidden])')).toBeNull());
    await expect(trigger.textContent).toContain('Four');
    // Keyboard: open, step up past the disabled option, commit.
    trigger.focus();
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(async () => expect(document.querySelector('[role="listbox"]:not([hidden])')).not.toBeNull());
    await userEvent.keyboard('{ArrowUp}{Enter}');
    await waitFor(async () => expect(picked().textContent).toBe('two'));
  },
};

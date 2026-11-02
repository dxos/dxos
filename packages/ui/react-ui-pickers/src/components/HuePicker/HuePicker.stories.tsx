//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, screen, userEvent, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { hues } from '@dxos/ui-types';

import { HuePicker, type HuePickerProps } from './HuePicker.tsx';

const DefaultStory = (props: HuePickerProps) => {
  const [hue, setHue] = useState<string | undefined>(props.defaultValue);

  return (
    <Toolbar.Root>
      <HuePicker
        {...props}
        value={hue}
        onChange={setHue}
        onReset={() => setHue(undefined)}
        rootVariant='toolbar-button'
      />
    </Toolbar.Root>
  );
};

const meta = {
  title: 'ui/react-ui-pickers/HuePicker',
  component: HuePicker,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof HuePicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    defaultValue: 'red',
  },
};

/** Every hue is a cell inside the popover, and a click picks it and closes the popover. */
export const Layout: Story = {
  args: {
    defaultValue: 'purple',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Select hue' }));
    const group = await screen.findByRole('radiogroup');
    const cells = within(group).getAllByRole('radio');
    await expect(cells).toHaveLength(hues.length);
    const popover = group.closest('[data-part="content"]');
    if (!popover) {
      throw new Error('the grid is not inside the popover content');
    }
    const content = popover.getBoundingClientRect();
    for (const cell of cells) {
      const rect = cell.getBoundingClientRect();
      await expect(rect.left >= content.left && rect.right <= content.right).toBe(true);
    }
    await expect(within(group).getByRole('radio', { name: 'purple' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(within(group).getByRole('radio', { name: 'blue' }));
    await expect(screen.queryByRole('radiogroup')).toBeNull();
  },
};

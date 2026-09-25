//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, within } from 'storybook/test';

import { withTheme } from '../../testing/index.ts';
import { IconButton } from '../Button/index.ts';
import { MenuButton, type MenuButtonItem } from './MenuButton.tsx';

const DEVICES = ['Built-in Microphone', 'AirPods Pro', 'USB Audio'];

const DefaultStory = () => {
  const [mode, setMode] = useState('toggle');
  const [device, setDevice] = useState('');
  const [extraction, setExtraction] = useState(true);

  const items: MenuButtonItem[] = [
    { type: 'group', label: 'Record mode' },
    { type: 'option', label: 'Toggle', selected: mode === 'toggle', onSelect: () => setMode('toggle') },
    { type: 'option', label: 'Hold to record', selected: mode === 'hold', onSelect: () => setMode('hold') },
    { type: 'separator' },
    { type: 'group', label: 'Input device' },
    { type: 'option', label: 'System default', selected: device === '', onSelect: () => setDevice('') },
    ...DEVICES.map((name): MenuButtonItem => ({
      type: 'option',
      label: name,
      selected: device === name,
      onSelect: () => setDevice(name),
    })),
    { type: 'separator' },
    {
      type: 'checkbox',
      label: 'Entity extraction',
      checked: extraction,
      onCheckedChange: setExtraction,
      testId: 'story.extraction',
    },
  ];

  return (
    // The split control the pattern exists for: a primary action, and its options beside it.
    <div className='flex items-center'>
      <IconButton icon='ph--microphone--regular' iconOnly variant='ghost' label='Record' />
      <MenuButton
        icon='ph--caret-down--regular'
        iconOnly
        variant='ghost'
        classNames='w-4'
        label='Recording options'
        data-testid='story.options'
        items={items}
      />
    </div>
  );
};

// No `component`: the story renders the split control the pattern exists for — a primary action
// beside its options — so the args belong to the composition, not to `MenuButton` alone.
const meta = {
  title: 'ui/react-ui-core/components/MenuButton',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TestSelection: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('story.options'));

    // The menu portals out of the canvas, so it is found on the document.
    const menu = within(document.body);
    const toggle = await menu.findByRole('menuitemradio', { name: 'Toggle' });
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    // Single-select: choosing another option moves the check rather than adding one.
    await userEvent.click(await menu.findByRole('menuitemradio', { name: 'Hold to record' }));
    await userEvent.click(await canvas.findByTestId('story.options'));
    await expect(await menu.findByRole('menuitemradio', { name: 'Hold to record' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(await menu.findByRole('menuitemradio', { name: 'Toggle' })).toHaveAttribute('aria-checked', 'false');
  },
};

//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { byTestId, expectAnchoredBelow, expectPopupSize } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';

const DEVICES = ['Built-in microphone', 'USB headset'];

const VIEW_ICONS: Record<string, string> = {
  List: 'ph--list--regular',
  Grid: 'ph--squares-four--regular',
  Board: 'ph--kanban--regular',
};

/** The microphone options caret: two headed radio runs, a separator, and a checkbox, beside an action of its own. */
const DefaultStory = ({ size = 'md' }: SizeArgs) => {
  const [mode, setMode] = useState<'toggle' | 'hold'>('toggle');
  const [device, setDevice] = useState('');
  const [extraction, setExtraction] = useState(false);
  const [view, setView] = useState('List');
  const items: Next.MenuButtonItem[] = [
    { type: 'group', label: 'Record mode' },
    { type: 'option', label: 'Toggle', selected: mode === 'toggle', onSelect: () => setMode('toggle') },
    { type: 'option', label: 'Hold', selected: mode === 'hold', onSelect: () => setMode('hold') },
    { type: 'separator' },
    { type: 'group', label: 'Audio device' },
    { type: 'option', label: 'Default', selected: device === '', onSelect: () => setDevice('') },
    ...DEVICES.map((label): Next.MenuButtonItem => ({
      type: 'option',
      label,
      selected: device === label,
      onSelect: () => setDevice(label),
      testId: `device-${label}`,
    })),
    { type: 'separator' },
    {
      type: 'checkbox',
      label: 'Entity extraction',
      checked: extraction,
      onCheckedChange: setExtraction,
      testId: `extraction-${size}`,
    },
  ];

  return (
    <Next.Group>
      <Next.Button icon='ph--microphone--regular' label='Record' />
      <Next.MenuButton
        icon='ph--caret-down--regular'
        iconOnly
        variant='ghost'
        label='Recording options'
        items={items}
        data-testid={`options-${size}`}
      />
      {/* The picker form: a default-variant button whose icon keeps its square's padding beside a half-cell caret. */}
      <Next.MenuButton
        icon={VIEW_ICONS[view]}
        iconOnly
        caretDown
        label='View'
        items={Object.keys(VIEW_ICONS).map((label) => ({
          type: 'option',
          label,
          selected: view === label,
          onSelect: () => setView(label),
        }))}
        data-testid={`view-${size}`}
      />
      <Next.Typography
        data-testid={`state-${size}`}
      >{`${mode} · ${device || 'default'} · ${extraction}`}</Next.Typography>
    </Next.Group>
  );
};

const meta = {
  title: 'ui/react-ui-core/next/components/MenuButton',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * The icon-only button is named by its label and opens an `md` menu below it. Each heading names
 * its run of options as a radio group whose checked option follows `selected`; choosing one calls its `onSelect` and
 * closes the menu; the checkbox reports `onCheckedChange`; separators split the runs. The story ends open.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const trigger = byTestId(canvasElement, 'options-md');
    const state = byTestId(canvasElement, 'state-md');
    await expect(trigger).toHaveAccessibleName('Recording options');
    await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');

    await userEvent.click(trigger);
    let menu = await body.findByRole('menu');
    await expectAnchoredBelow(trigger, menu);
    await expectPopupSize(menu, 'md');
    const groups = within(menu).getAllByRole('group');
    await expect(groups).toHaveLength(2);
    await expect(within(menu).getByRole('group', { name: 'Record mode' })).toBeInTheDocument();
    const devices = within(menu).getByRole('group', { name: 'Audio device' });
    await expect(within(devices).getAllByRole('menuitemradio')).toHaveLength(3);
    await expect(within(menu).getByRole('menuitemradio', { name: 'Toggle' })).toHaveAttribute('aria-checked', 'true');
    await expect(within(menu).getByRole('menuitemradio', { name: 'Hold' })).toHaveAttribute('aria-checked', 'false');
    await expect(within(menu).getAllByRole('separator')).toHaveLength(2);

    // An option calls its `onSelect` and closes the menu.
    await userEvent.click(within(menu).getByRole('menuitemradio', { name: 'Hold' }));
    await waitFor(() => expect(body.queryByRole('menu')).toBeNull());
    await expect(state).toHaveTextContent('hold · default · false');

    // Keyboard: open, walk to the second device, choose it.
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    menu = await body.findByRole('menu');
    await waitFor(() =>
      expect(within(menu).getByRole('menuitemradio', { name: 'Hold' })).toHaveAttribute('aria-checked', 'true'),
    );
    await userEvent.click(within(menu).getByTestId('device-USB headset'));
    await waitFor(() => expect(body.queryByRole('menu')).toBeNull());
    await expect(state).toHaveTextContent('hold · USB headset · false');

    // The checkbox.
    await userEvent.click(trigger);
    menu = await body.findByRole('menu');
    const checkbox = within(menu).getByRole('menuitemcheckbox', { name: 'Entity extraction' });
    await expect(checkbox).toHaveAttribute('aria-checked', 'false');
    await expect(checkbox).toHaveAttribute('data-testid', 'extraction-md');
    await userEvent.click(checkbox);
    await waitFor(() => expect(state).toHaveTextContent('hold · USB headset · true'));
    await waitFor(() => expect(body.queryByRole('menu')).toBeNull());

    // The menu is `md` whatever its trigger row's size, so menus read at one density.
    await userEvent.click(byTestId(canvasElement, 'options-sm'));
    await expectPopupSize(await body.findByRole('menu'), 'md');
  },
};

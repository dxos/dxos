//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { realHover, realUnhover, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import * as Field from '../Field/Field.tsx';
import { Input } from '../Input/Input.tsx';
import { Switch } from '../Switch/Switch.tsx';
import * as Typography from '../Typography/Typography.tsx';
import * as Collapsible from './Collapsible.tsx';

const DefaultStory = () => (
  <Collapsible.Root>
    <Collapsible.Trigger>Advanced settings</Collapsible.Trigger>
    <Collapsible.Content data-testid='content'>
      <Typography.Text>These settings change how your space syncs.</Typography.Text>
      <Field.Root>
        <Field.Header>
          <Field.Label>Sync interval</Field.Label>
        </Field.Header>
        <Input defaultValue='30s' />
      </Field.Root>
      <Switch label='Sync over cellular' />
    </Collapsible.Content>
  </Collapsible.Root>
);

const meta = {
  title: 'ui/react-ui-core/components/Collapsible',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The trigger toggles the section by pointer and keyboard; the story ends open. */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    const canvas = within(sizeRow(canvasElement, 'md'));
    const trigger = canvas.getByRole('button', { name: 'Advanced settings' });
    const content = canvas.getByTestId('content');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    // Hover recolours the text and leaves the row unfilled.
    const rest = getComputedStyle(trigger);
    const [restColor, restBackground] = [rest.color, rest.backgroundColor];
    await realHover(trigger);
    await waitFor(() => expect(getComputedStyle(trigger).color).not.toBe(restColor));
    await expect(getComputedStyle(trigger).backgroundColor).toBe(restBackground);
    await realUnhover(trigger);
    await expect(content).not.toBeVisible();

    // The trigger is a block row.
    const block = parseFloat(getComputedStyle(trigger).getPropertyValue('--dx-block-size')) * 16;
    await expect(trigger.getBoundingClientRect().height).toBeCloseTo(block, 0);

    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(canvas.getByText('These settings change how your space syncs.')).toBeVisible());
    await expect(trigger).toHaveAttribute('aria-controls', content.id);

    // The caret turns to point down while open.
    const indicator = trigger.querySelector('[data-part="indicator"]');
    await waitFor(() => expect(indicator ? getComputedStyle(indicator).transform : '').not.toBe('none'));

    // `aria-expanded` stays true until the closing animation ends.
    await userEvent.click(trigger);
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
    await expect(content).not.toBeVisible();

    // Enter on the focused trigger reopens it.
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(canvas.getByRole('textbox', { name: 'Sync interval' })).toBeVisible());
  },
};

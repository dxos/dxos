//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import { Block } from '../Block/Block.tsx';
import { Button } from '../Button/Button.tsx';
import { Checkbox } from '../Checkbox/Checkbox.tsx';
import * as Collapsible from '../Collapsible/Collapsible.tsx';
import { Container } from '../Container/Container.tsx';
import * as Field from '../Field/Field.tsx';
import { Group } from '../Group/Group.tsx';
import * as Icon from '../Icon/Icon.tsx';
import { Input } from '../Input/Input.tsx';
import { Switch } from '../Switch/Switch.tsx';
import * as Fieldset from './Fieldset.tsx';

/**
 * Valid and enabled sets, then an invalid and a disabled one, and a set whose fields span a two-column row; test ids are
 * scoped by the size row.
 */
const DefaultStory = () => (
  <>
    <Fieldset.Root data-testid='profile'>
      <Fieldset.Legend>
        Profile
        <Block data-testid='profile-lock'>
          <Icon.Icon icon='ph--user--regular' />
        </Block>
      </Fieldset.Legend>
      <Field.Root data-testid='name'>
        <Field.Header>
          <Field.Label>Name</Field.Label>
        </Field.Header>
        <Input placeholder='Ada Lovelace' />
      </Field.Root>
      <Field.Root data-testid='email'>
        <Field.Header>
          <Field.Label>Email</Field.Label>
        </Field.Header>
        <Input type='email' placeholder='ada@example.com' />
      </Field.Root>
      <Fieldset.HelperText>Shown on your public page.</Fieldset.HelperText>
      <Fieldset.ErrorText>Complete your profile.</Fieldset.ErrorText>
    </Fieldset.Root>

    <Fieldset.Root data-testid='notifications'>
      <Fieldset.Legend>Notifications</Fieldset.Legend>
      <Switch label='Email digests' defaultChecked />
      <Switch label='Mentions' />
      <Switch label='Product updates' />
      <Checkbox label='Email me a weekly digest' />
    </Fieldset.Root>

    <Fieldset.Root invalid>
      <Fieldset.Legend>Account</Fieldset.Legend>
      <Field.Root>
        <Field.Header>
          <Field.Label>Handle</Field.Label>
        </Field.Header>
        <Input />
      </Field.Root>
      <Field.Root>
        <Field.Header>
          <Field.Label>Recovery email</Field.Label>
        </Field.Header>
        <Input type='email' />
      </Field.Root>
      <Fieldset.ErrorText>Complete your account.</Fieldset.ErrorText>
    </Fieldset.Root>

    <Fieldset.Root disabled>
      <Fieldset.Legend>Privacy</Fieldset.Legend>
      <Switch label='Show online status' />
      <Switch label='Read receipts' />
      <Checkbox label='Share usage data' />
      <Input aria-label='Alias' />
      <Button>Reset</Button>
    </Fieldset.Root>

    <Fieldset.Root data-testid='address'>
      <Fieldset.Legend>Address</Fieldset.Legend>
      <Container layout='row' columns='repeat(2, minmax(0, 1fr))' gap='md' data-testid='address-grid'>
        <Field.Root span='full' data-testid='street'>
          <Field.Header>
            <Field.Label>Street</Field.Label>
          </Field.Header>
          <Input />
        </Field.Root>
        <Field.Root data-testid='city'>
          <Field.Header>
            <Field.Label>City</Field.Label>
          </Field.Header>
          <Input />
        </Field.Root>
        <Field.Root data-testid='zip'>
          <Field.Header>
            <Field.Label>ZIP</Field.Label>
          </Field.Header>
          <Input />
        </Field.Root>
        <Fieldset.Root span={2} data-testid='delivery'>
          <Fieldset.Legend>Delivery</Fieldset.Legend>
          <Checkbox label='Leave at the door' />
        </Fieldset.Root>
      </Container>
    </Fieldset.Root>

    {/* Grid sets: subgrids of the enclosing Container at any depth, the inner one folding a subgrid Collapsible. */}
    <Fieldset.Root gutter='inherit' level='+1' data-testid='shipping'>
      <Fieldset.Legend>Shipping</Fieldset.Legend>
      <Field.Root data-testid='carrier'>
        <Field.Header>
          <Field.Label>Carrier</Field.Label>
        </Field.Header>
        <Input />
      </Field.Root>
      <Collapsible.Root asChild defaultOpen>
        <Fieldset.Root gutter='inherit' level='+1' disabled data-testid='geo'>
          <Fieldset.Legend>
            <Collapsible.Trigger>Coordinates</Collapsible.Trigger>
          </Fieldset.Legend>
          <Collapsible.Content gutter='inherit'>
            <Field.Root data-testid='latitude'>
              <Field.Header>
                <Field.Label>Latitude</Field.Label>
              </Field.Header>
              <Input />
            </Field.Root>
          </Collapsible.Content>
        </Fieldset.Root>
      </Collapsible.Root>
    </Fieldset.Root>

    <Group justify='end'>
      <Button>Cancel</Button>
      <Button type='submit' variant='primary'>
        Save
      </Button>
    </Group>
  </>
);

const meta = {
  title: 'ui/react-ui-core/components/Fieldset',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

const bounds = (root: HTMLElement, selector: string) => {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) {
    throw new Error(`missing ${selector}`);
  }
  return element.getBoundingClientRect();
};

export const Default: Story = {};

/**
 * Sets are `div` groups named by their legend row, which lines up with the fields' labels and controls; a disabled set
 * disables every control inside it through context, and an invalid set shows its error and marks its fields invalid.
 * Fields and sets take `span` in a multi-column row.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement: canvasRoot }) => {
    const canvasElement = sizeRow(canvasRoot, 'md');
    const canvas = within(canvasElement);
    const profile = canvas.getByRole('group', { name: 'Profile' });
    await expect(profile.tagName).toBe('DIV');
    await expect(profile).toHaveAttribute('data-scope', 'fieldset');
    await expect(profile).toHaveAccessibleDescription('Shown on your public page.');
    await expect(canvas.getByRole('group', { name: 'Notifications' })).toBeInTheDocument();
    await expect(getComputedStyle(profile).borderTopWidth).toBe('0px');

    // The legend is a control-tall label row spanning the content track, like a Field's header.
    const legend = bounds(canvasElement, '[data-testid="profile"] [data-part="legend"]');
    const label = bounds(canvasElement, '[data-testid="name"] label');
    const input = bounds(canvasElement, '[data-testid="name"] .dx-input');
    await expect(legend.height).toBeCloseTo(28, 0);
    await expect(legend.left).toBeCloseTo(label.left, 0);
    // The trailing Block is inset in a block-sized cell that ends at the control's edge.
    await expect(bounds(canvasElement, '[data-testid="profile-lock"]').right + 2).toBeCloseTo(input.right, 0);

    // Fields are spaced by the gap token; switches and the checkbox start on the legend's edge.
    const email = bounds(canvasElement, '[data-testid="email"]');
    const name = bounds(canvasElement, '[data-testid="name"]');
    await expect(email.top - name.bottom).toBeCloseTo(8, 0);
    // Switches and the checkbox each take an icon-only Button's block-sized cell on the legend's edge, so labels align.
    const notifications = bounds(canvasElement, '[data-testid="notifications"] [data-part="legend"]');
    const controls = canvasElement.querySelectorAll<HTMLElement>(
      '[data-testid="notifications"] :is([data-scope="switch"], [data-scope="checkbox"])[data-part="control"]',
    );
    const labels = canvasElement.querySelectorAll<HTMLElement>(
      '[data-testid="notifications"] :is([data-scope="switch"], [data-scope="checkbox"])[data-part="label"]',
    );
    for (const control of controls) {
      const style = getComputedStyle(control);
      const rect = control.getBoundingClientRect();
      const cellLeft = rect.left - parseFloat(style.marginLeft);
      const cellWidth = rect.width + parseFloat(style.marginLeft) + parseFloat(style.marginRight);
      await expect(cellLeft).toBeCloseTo(notifications.left, 0);
      await expect(cellLeft).toBeCloseTo(legend.left, 0);
      await expect(cellWidth).toBeCloseTo(32, 0);
    }
    for (const label of labels) {
      await expect(label.getBoundingClientRect().left).toBeCloseTo(labels[0].getBoundingClientRect().left, 0);
    }
    await expect(canvas.queryByText('Complete your profile.')).toBeNull();
    await expect(canvas.getByRole('group', { name: 'Profile' })).not.toHaveAttribute('data-invalid');
    await expect(canvas.getByRole('group', { name: 'Notifications' })).not.toHaveAttribute('aria-disabled');

    await expect(canvas.getByRole('group', { name: 'Privacy' })).toHaveAttribute('aria-disabled', 'true');
    for (const name of ['Show online status', 'Read receipts']) {
      await expect(canvas.getByRole('switch', { name })).toBeDisabled();
    }
    await expect(canvas.getByRole('checkbox', { name: 'Share usage data' })).toBeDisabled();
    await expect(canvas.getByRole('textbox', { name: 'Alias' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Reset' })).toBeDisabled();
    await expect(canvas.getByRole('textbox', { name: 'Name' })).toBeEnabled();

    // A grid set is a `group` element (a `<fieldset>` cannot be a subgrid) whose fields keep the content track at any
    // depth, a nested set's Collapsible Content included; its legend is a grid item on the content track too.
    const shipping = canvas.getByRole('group', { name: 'Shipping' });
    await expect(shipping.tagName).toBe('DIV');
    await expect(shipping).toHaveAttribute('data-surface', '+1');
    await expect(getComputedStyle(shipping).display).toBe('grid');
    for (const field of ['carrier', 'latitude']) {
      const control = bounds(canvasElement, `[data-testid="${field}"] .dx-input`);
      await expect(control.left).toBeCloseTo(input.left, 0);
      await expect(control.right).toBeCloseTo(input.right, 0);
    }
    await expect(bounds(canvasElement, '[data-testid="shipping"] > [data-part="legend"]').left).toBeCloseTo(
      label.left,
      0,
    );
    // Disabled reaches a grid set's fields through Ark's context rather than the native fieldset.
    await expect(canvas.getByRole('textbox', { name: 'Latitude' })).toBeDisabled();
    await expect(canvas.getByRole('textbox', { name: 'Carrier' })).toBeEnabled();

    await expect(canvas.getByText('Complete your account.')).toBeVisible();
    await expect(canvas.getByRole('group', { name: 'Account' })).toHaveAttribute('data-invalid');
    for (const name of ['Handle', 'Recovery email']) {
      await expect(canvas.getByRole('textbox', { name })).toHaveAttribute('aria-invalid', 'true');
    }

    const grid = bounds(canvasElement, '[data-testid="address-grid"]');
    const street = bounds(canvasElement, '[data-testid="street"]');
    const city = bounds(canvasElement, '[data-testid="city"]');
    const zip = bounds(canvasElement, '[data-testid="zip"]');
    const delivery = bounds(canvasElement, '[data-testid="delivery"]');
    await expect(street.left).toBeCloseTo(grid.left, 0);
    await expect(street.width).toBeCloseTo(grid.width, 0);
    await expect(city.top).toBeGreaterThanOrEqual(street.bottom);
    await expect(zip.top).toBeCloseTo(city.top, 0);
    await expect(zip.left - city.right).toBeCloseTo(8, 0);
    await expect(zip.right).toBeCloseTo(grid.right, 0);
    await expect(delivery.width).toBeCloseTo(grid.width, 0);
    await expect(canvas.getByRole('group', { name: 'Delivery' })).toBeInTheDocument();
  },
};

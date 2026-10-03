//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { invariant } from '@dxos/invariant';

import { translations } from '#translations';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, byTestId, controlSize, expectEndCell, expectScoped, expectTooltip, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import {
  Button,
  Checkbox,
  Container,
  DateInput,
  Field,
  type FieldValence,
  Input,
  NumberInput,
  PasswordInput,
  PinInput,
  Switch,
  Textarea,
  Typography,
} from '../index.ts';

const VALENCES: FieldValence[] = ['success', 'info', 'warning', 'error'];

/**
 * Every current `Field` part as a Next field (DESIGN.md follow-up 54): text, textarea, the segmented date, time and
 * date-time with the calendar trigger, PIN, number, password, and a checkbox and switch in block cells (the current
 * `Field.Block`). A `required` field (its label marked automatically, then with the mark placed by hand), a `readOnly`
 * one and an `asChild` root close it.
 */
const EveryField = ({ size }: SizeArgs) => (
  <>
    <Field.Root>
      <Field.Label>Name</Field.Label>
      <Input data-testid={`every-input-${size}`} />
    </Field.Root>
    <Field.Root>
      <Field.Label>Bio</Field.Label>
      <Textarea />
    </Field.Root>
    <Field.Root>
      <Field.Label>Birthday</Field.Label>
      <DateInput defaultValue='1990-04-01' data-testid={`every-date-${size}`} />
    </Field.Root>
    <Field.Root>
      <Field.Label>Wake up</Field.Label>
      <DateInput type='time' defaultValue='07:00' data-testid={`every-time-${size}`} />
    </Field.Root>
    <Field.Root>
      <Field.Label>Meeting</Field.Label>
      <DateInput type='datetime-local' defaultValue='2026-09-29T14:00' />
    </Field.Root>
    <Field.Root>
      <Field.Label>Code</Field.Label>
      <PinInput length={4} data-testid={`every-pin-${size}`} />
    </Field.Root>
    <Field.Root>
      <Field.Label>Age</Field.Label>
      <NumberInput min={0} defaultValue='30' data-testid={`every-number-${size}`} />
    </Field.Root>
    <Field.Root>
      <Field.Label>Password</Field.Label>
      <PasswordInput data-testid={`every-password-${size}`} />
    </Field.Root>
    <Field.Root>
      <Checkbox label='Subscribe' data-testid={`every-checkbox-${size}`} />
    </Field.Root>
    <Field.Root>
      <Switch label='Notifications' data-testid={`every-switch-${size}`} />
    </Field.Root>
    <Field.Root required>
      <Field.Label data-testid={`required-label-${size}`}>Handle</Field.Label>
      <Input />
    </Field.Root>
    <Field.Root required>
      <Field.Label data-testid={`placed-label-${size}`}>
        <Field.RequiredIndicator>required</Field.RequiredIndicator> Alias
      </Field.Label>
      <Input />
    </Field.Root>
    <Field.Root readOnly>
      <Field.Label>Id</Field.Label>
      <Input defaultValue='abc-123' />
    </Field.Root>
    <Field.Root asChild data-testid={`every-as-child-${size}`}>
      <section>
        <Field.Label>Nickname</Field.Label>
        <Input />
      </section>
    </Field.Root>
  </>
);

/**
 * A labelled field with helper text, the same header-with-action field valid and invalid, a field per validation
 * valence, one with a visually hidden label, then every field type.
 */
const DefaultStory = ({ size }: SizeArgs) => (
  <>
    <Field.Root data-testid={`field-${size}`}>
      <Field.Label>Email</Field.Label>
      <Input data-testid={`field-input-${size}`} />
      <Field.HelperText>We never share it.</Field.HelperText>
    </Field.Root>
    {(['Website', 'Homepage'] as const).map((name) => (
      <Field.Root key={name} invalid={name === 'Homepage'} data-testid={`${name.toLowerCase()}-${size}`}>
        <Field.Header>
          <Field.Label>{name}</Field.Label>
          <Button icon='ph--x--regular' label={`Clear ${name.toLowerCase()}`} iconOnly />
        </Field.Header>
        <Input defaultValue='not a url' />
        <Field.ErrorText>Enter a valid URL.</Field.ErrorText>
      </Field.Root>
    ))}
    {VALENCES.map((valence) => (
      <Field.Root key={valence} validationValence={valence} data-testid={`${valence}-${size}`}>
        <Field.Label>Handle ({valence})</Field.Label>
        <Input defaultValue='dxos' data-testid={`${valence}-input-${size}`} />
        <Field.HelperText data-testid={`${valence}-helper-${size}`}>A {valence} message.</Field.HelperText>
        <Field.ErrorText>The handle is taken.</Field.ErrorText>
      </Field.Root>
    ))}
    <Field.Root>
      <Field.Label srOnly data-testid={`hidden-label-${size}`}>
        Filter
      </Field.Label>
      <Input placeholder='Filter' />
    </Field.Root>
    <EveryField size={size} />
    {/* Row fields (Phase 4 decision 3): bordered subgrid rows of the Container's two tracks. */}
    <Container gutter='inherit' columns='minmax(0, 1fr) [control] minmax(0, 1fr)'>
      {['Theme', 'Language'].map((name) => (
        <Field.Root key={name} layout='row' level='+1' data-testid={`row-${name.toLowerCase()}-${size}`}>
          <Field.Header>
            <Field.Label>{name}</Field.Label>
          </Field.Header>
          <Field.HelperText>The app's {name.toLowerCase()}.</Field.HelperText>
          <Input />
        </Field.Root>
      ))}
    </Container>
    {/* A header whose label is text (no single control to name): its action still ends the row. */}
    <Field.Header data-testid={`text-header-${size}`}>
      <Typography truncate>Tags</Typography>
      <Button iconOnly variant='ghost' icon='ph--plus--regular' label='Add tag' />
    </Field.Header>
    {/* A row with its own columns spaces them by its gap. */}
    <Container layout='row' gutter='inherit' columns='minmax(0, 1fr) minmax(0, 1fr)' gap='sm'>
      <Input aria-label='Latitude' data-testid={`pair-first-${size}`} />
      <Input aria-label='Longitude' data-testid={`pair-second-${size}`} />
    </Container>
  </>
);

const meta = {
  title: 'ui/react-ui-core/components/Field',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered', translations },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * In a Field stack the field pads its control out to a block (finding 11); the field wires its label and helper text
 * to the control, and ErrorText renders only while invalid; a trailing icon-only Button in `Field.Header` shows its
 * label in a Tooltip (left open). `validationValence` gives the control a 1px border and focus ring in the valence's
 * border colour and the HelperText its text colour; `error` also makes the field invalid. An `srOnly` label still
 * names its control.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const input = byTestId(canvasElement, `field-input-${size}`);
      await expect(input.getBoundingClientRect().height, size).toBeCloseTo(controlSize(size), 0);
      await expect(parseFloat(getComputedStyle(input).marginTop), size).toBeCloseTo(GEOMETRY[size].inset, 0);
      await expect(parseFloat(getComputedStyle(input).marginBottom), size).toBeCloseTo(GEOMETRY[size].inset, 0);
    }

    const canvas = within(sizeRow(canvasElement, 'md'));
    const input = canvas.getByRole('textbox', { name: 'Email' });
    await expect(input).toBe(byTestId(canvasElement, 'field-input-md'));
    await expect(input).toHaveAccessibleDescription('We never share it.');
    await expect(byTestId(canvasElement, 'field-md').dataset.scope).toBe('field');
    const website = within(byTestId(canvasElement, 'website-md'));
    await expect(website.queryByText('Enter a valid URL.')).toBeNull();
    await expect(website.getByRole('textbox', { name: 'Website' })).not.toHaveAttribute('aria-invalid', 'true');
    await expectScoped(canvasElement);

    const homepage = within(byTestId(canvasElement, 'homepage-md'));
    await expect(homepage.getByText('Enter a valid URL.')).toBeVisible();
    await expect(homepage.getByRole('textbox', { name: 'Homepage' })).toHaveAttribute('aria-invalid', 'true');
    await expect(byTestId(canvasElement, 'homepage-md')).toHaveAttribute('data-invalid');

    const plainHelper = getComputedStyle(
      within(byTestId(canvasElement, 'field-md')).getByText('We never share it.'),
    ).color;
    const tones = new Set<string>();
    for (const valence of VALENCES) {
      const input = byTestId(canvasElement, `${valence}-input-md`);
      await expect(getComputedStyle(input).boxShadow, valence).toMatch(/0px 0px 0px 1px inset$/);
      const helper = getComputedStyle(byTestId(canvasElement, `${valence}-helper-md`)).color;
      await expect(helper, valence).not.toBe(plainHelper);
      tones.add(helper);
      const errorText = within(byTestId(canvasElement, `${valence}-md`)).queryByText('The handle is taken.');
      if (valence === 'error') {
        await expect(input).toHaveAttribute('aria-invalid', 'true');
        await expect(errorText).toBeVisible();
      } else {
        await expect(input).not.toHaveAttribute('aria-invalid', 'true');
        await expect(errorText).toBeNull();
      }
    }
    await expect(tones.size).toBe(VALENCES.length);
    await expect(canvas.getByRole('textbox', { name: 'Filter' })).toBeInTheDocument();
    await expect(byTestId(canvasElement, 'hidden-label-md').getBoundingClientRect().width).toBeLessThanOrEqual(1);

    // Every field type is named by its Field label; a checkbox or switch takes a block like the current `Field.Block`.
    for (const size of SIZES) {
      for (const part of ['input', 'date', 'time', 'number', 'password']) {
        const control = byTestId(canvasElement, `every-${part}-${size}`);
        await expect(control.getBoundingClientRect().height, `${part} ${size}`).toBeCloseTo(controlSize(size), 0);
      }
      for (const part of ['checkbox', 'switch']) {
        const control = byTestId(canvasElement, `every-${part}-${size}`);
        await expect(control.getBoundingClientRect().height, `${part} ${size}`).toBeCloseTo(GEOMETRY[size].block, 0);
      }
    }
    await expect(canvas.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    await expect(canvas.getByRole('textbox', { name: 'Bio' }).tagName).toBe('TEXTAREA');
    await expect(canvas.getByRole('group', { name: 'Birthday' })).toBeInTheDocument();
    await expect(
      within(byTestId(canvasElement, 'every-date-md')).getByRole('button', { name: 'Pick a date' }),
    ).toBeVisible();
    await expect(canvas.getByRole('group', { name: 'Wake up' })).toBeInTheDocument();
    await expect(canvas.getByRole('group', { name: 'Meeting' })).toBeInTheDocument();
    await expect(within(canvas.getByRole('group', { name: 'Code' })).getAllByRole('textbox')).toHaveLength(4);
    await expect(canvas.getByRole('spinbutton', { name: 'Age' })).toHaveValue('30');
    await expect(canvas.getByLabelText('Password')).toHaveAttribute('type', 'password');
    await expect(canvas.getByRole('checkbox', { name: 'Subscribe' })).toBeInTheDocument();
    await expect(canvas.getByRole('switch', { name: 'Notifications' })).toBeInTheDocument();
    await expect(canvas.getByRole('textbox', { name: 'Handle' })).toBeRequired();
    // A required root's label ends with Ark's mark on its own, kept out of the name; one placed in the label replaces it.
    const marks = byTestId(canvasElement, 'required-label-md').querySelectorAll('[data-part="required-indicator"]');
    await expect(marks).toHaveLength(1);
    await expect(marks[0]).toHaveTextContent('*');
    await expect(marks[0]).toHaveAttribute('aria-hidden', 'true');
    await expect(
      canvas
        .getByRole('textbox', { name: 'Id' })
        .closest('.nx-field')
        ?.querySelector('[data-part="required-indicator"]'),
    ).toBeNull();
    const placed = byTestId(canvasElement, 'placed-label-md').querySelectorAll('[data-part="required-indicator"]');
    await expect(placed).toHaveLength(1);
    await expect(placed[0]).toHaveTextContent('required');
    await expect(canvas.getByRole('textbox', { name: 'Alias' })).toBeRequired();
    await expect(canvas.getByRole('textbox', { name: 'Id' })).toHaveAttribute('readonly');
    const asChild = byTestId(canvasElement, 'every-as-child-md');
    await expect(asChild.tagName).toBe('SECTION');
    await expect(asChild).toHaveClass('nx-field');
    await expect(within(asChild).getByRole('textbox', { name: 'Nickname' })).toBeInTheDocument();

    // Row fields share the Container's tracks: the header spans the row; the helper (before the `control` line) and the
    // control (after it) share the next line, top-aligned to the control's cell.
    const rows = ['theme', 'language'].map((name) => {
      const row = byTestId(canvasElement, `row-${name}-md`);
      const inputElement = row.querySelector<HTMLElement>('.nx-input');
      const headerElement = row.querySelector('[data-part="header"]');
      const helperElement = row.querySelector('[data-part="helper-text"]');
      invariant(inputElement && headerElement && helperElement);
      return {
        row,
        header: headerElement.getBoundingClientRect(),
        helper: helperElement.getBoundingClientRect(),
        input: inputElement.getBoundingClientRect(),
        inputTop: inputElement.getBoundingClientRect().top - parseFloat(getComputedStyle(inputElement).marginTop),
      };
    });
    for (const { row, header, helper, input, inputTop } of rows) {
      await expect(input.left).toBeCloseTo(rows[0].input.left, 0);
      await expect(header.right).toBeGreaterThanOrEqual(input.right - 0.5);
      await expect(helper.top).toBeGreaterThanOrEqual(header.bottom - 0.5);
      await expect(helper.right).toBeLessThanOrEqual(input.left + 0.5);
      await expect(helper.top).toBeCloseTo(inputTop, 0);
      await expect(row).toHaveAttribute('data-surface', '+1');
      await expect(getComputedStyle(row).borderTopWidth).toBe('1px');
    }
    await expect(canvas.getByRole('textbox', { name: 'Theme' })).toBeInTheDocument();
    const first = byTestId(canvasElement, 'pair-first-md').getBoundingClientRect();
    const second = byTestId(canvasElement, 'pair-second-md').getBoundingClientRect();
    await expect(second.left - first.right).toBeCloseTo(4, 0);

    // Header actions end the row whatever the label is: the icon sits in the block-wide end cell.
    for (const size of SIZES) {
      const header = byTestId(canvasElement, `text-header-${size}`);
      const box = header.getBoundingClientRect();
      await expect(header.firstElementChild!.getBoundingClientRect().left, `${size} text label`).toBeCloseTo(
        box.left,
        0,
      );
      await expectEndCell(
        within(header).getByRole('button', { name: 'Add tag' }).querySelector('svg'),
        box.right,
        size,
        size,
      );
    }

    // Colours resolved from the tokens, through a probe element in the same scope.
    const resolve = (token: string) => {
      const probe = canvasElement.ownerDocument.createElement('span');
      probe.style.color = `var(${token})`;
      canvasElement.appendChild(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    };

    // Label and help text are interface text in the subdued colour, distinct from the value; help text is a size smaller.
    const field = within(byTestId(canvasElement, 'field-md'));
    const emailLabel = getComputedStyle(field.getByText('Email'));
    const helper = getComputedStyle(field.getByText('We never share it.'));
    const value = getComputedStyle(field.getByRole('textbox'));
    await expect(emailLabel.color).toBe(resolve('--color-subdued'));
    await expect(helper.color).toBe(resolve('--color-subdued'));
    await expect(parseFloat(helper.fontSize)).toBeLessThan(parseFloat(emailLabel.fontSize));
    await expect(emailLabel.color).not.toBe(value.color);
    await expect(helper.color).not.toBe(value.color);

    // The required mark is warning-coloured, a small gap after the label's text.
    const requiredLabel = byTestId(canvasElement, 'required-label-md');
    const mark = requiredLabel.querySelector<HTMLElement>('[data-part="required-indicator"]');
    invariant(mark && requiredLabel.firstChild);
    await expect(getComputedStyle(mark).color).toBe(resolve('--color-warning-text'));
    const range = canvasElement.ownerDocument.createRange();
    range.selectNodeContents(requiredLabel.firstChild);
    await expect(mark.getBoundingClientRect().left - range.getBoundingClientRect().right).toBeGreaterThan(0.5);

    const clear = website.getByRole('button', { name: 'Clear website' });
    await userEvent.hover(clear);
    await expectTooltip(clear, 'Clear website');
  },
};

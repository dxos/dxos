//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { translations } from '#translations';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../stories.tsx';
import { GEOMETRY, byTestId, controlSize, expectAnchoredBelow, expectScoped, sizeRow } from '../../testing.ts';
import { type FieldRootProps } from '../Field/index.ts';

type ValueFieldProps = Next.DateInputProps & { label: string; testId: string; fieldProps?: FieldRootProps };

/** A labelled DateInput whose value string is shown beside it, so a test can read what the field reports. */
const ValueField = ({ label, testId, fieldProps, defaultValue = '', ...props }: ValueFieldProps) => {
  const [value, setValue] = useState(defaultValue);
  return (
    <Next.Field.Root {...fieldProps}>
      <Next.Field.Label>{label}</Next.Field.Label>
      <Next.DateInput {...props} value={value} onValueChange={setValue} data-testid={testId} />
      <Next.Field.HelperText>
        Value: <output data-testid={`${testId}-value`}>{value}</output>
      </Next.Field.HelperText>
    </Next.Field.Root>
  );
};

const DefaultStory = ({ size = 'md' }: SizeArgs) => (
  <>
    <ValueField label='Due' testId={`date-${size}`} size={size} defaultValue='2026-09-29' />
    <Next.Input aria-label='Note' data-testid={`input-${size}`} />
    <ValueField label='Starts at' testId={`time-${size}`} type='time' size={size} defaultValue='09:30' />
    <ValueField
      label='Reminder'
      testId={`datetime-${size}`}
      type='datetime-local'
      size={size}
      defaultValue='2026-09-29T09:30'
    />
    <ValueField label='Empty' testId={`empty-${size}`} size={size} />
    <ValueField label='Alarm' testId={`alarm-${size}`} type='time' hourCycle={12} size={size} />
    <ValueField
      label='Window'
      testId={`window-${size}`}
      size={size}
      min='2026-09-10'
      max='2026-09-20'
      defaultValue='2026-09-15'
    />
    <ValueField label='Datum' testId={`locale-${size}`} locale='de-DE' size={size} defaultValue='2026-09-29' />
    <ValueField
      label='Locked'
      testId={`readonly-${size}`}
      size={size}
      defaultValue='2026-09-29'
      fieldProps={{ readOnly: true }}
    />
    <ValueField
      label='Overdue'
      testId={`invalid-${size}`}
      size={size}
      defaultValue='2026-01-01'
      fieldProps={{ invalid: true }}
    />
    <ValueField
      label='Archived'
      testId={`disabled-${size}`}
      size={size}
      defaultValue='2026-09-29'
      fieldProps={{ disabled: true }}
    />
  </>
);

const meta = {
  title: 'ui/react-ui-core/next/components/DateInput',
  render: DefaultStory,
  decorators: [withSizes(), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered', translations },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Types with the runner's real keyboard: zag reads digits from React's `onBeforeInput`, which the browser raises from
 * trusted key presses (`textInput`) but not from synthetic ones.
 */
const realType = async (text: string) => {
  const { userEvent: keyboard } = await import('vitest/browser');
  await keyboard.keyboard(text);
};

const segmentTypes = (group: HTMLElement) =>
  within(group)
    .getAllByRole('spinbutton')
    .map((segment) => segment.dataset.type);

/**
 * The row is a control at every size, as wide as an Input; segments are spinbuttons named by the Field label and
 * ordered by the locale; typing digits fills and advances segments, ArrowUp/Down step one, and the field reports the
 * native value format. The trailing trigger opens the calendar anchored below the row, a day click sets the date and
 * min/max disable days outside the window. Read-only, invalid and disabled come from `Field.Root`.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const row = byTestId(canvasElement, `date-${size}`);
      const rect = row.getBoundingClientRect();
      const input = byTestId(canvasElement, `input-${size}`).getBoundingClientRect();
      await expect(rect.height, `${size} height`).toBeCloseTo(controlSize(size), 0);
      await expect(rect.width, `${size} width`).toBeCloseTo(input.width, 0);
      await expect(parseFloat(getComputedStyle(row).marginTop), `${size} inset`).toBeCloseTo(GEOMETRY[size].inset, 0);
      const trigger = within(row).getByRole('button', { name: 'Pick a date' });
      await expect(trigger.getBoundingClientRect().right, `${size} trigger end`).toBeCloseTo(
        rect.right - GEOMETRY[size].inset,
        0,
      );
    }
    await expectScoped(canvasElement);

    const md = sizeRow(canvasElement, 'md');
    const canvas = within(md);
    const value = (testId: string) => byTestId(md, `${testId}-md-value`);

    // Label and description reach the segments; en-US orders month/day/year, de-DE day/month/year.
    const due = canvas.getByRole('group', { name: 'Due' });
    await expect(due).toHaveAccessibleDescription('Value: 2026-09-29');
    await expect(segmentTypes(due)).toEqual(['month', 'day', 'year']);
    await expect(segmentTypes(canvas.getByRole('group', { name: 'Datum' }))).toEqual(['day', 'month', 'year']);
    await expect(segmentTypes(canvas.getByRole('group', { name: 'Starts at' }))).toEqual(['hour', 'minute']);
    await expect(segmentTypes(canvas.getByRole('group', { name: 'Reminder' }))).toEqual([
      'month',
      'day',
      'year',
      'hour',
      'minute',
    ]);
    await expect(segmentTypes(canvas.getByRole('group', { name: 'Alarm' }))).toEqual(['hour', 'minute', 'dayPeriod']);

    // Typing digits fills each segment and advances; the value is reported once complete.
    const empty = canvas.getByRole('group', { name: 'Empty' });
    await userEvent.click(within(empty).getAllByRole('spinbutton')[0]);
    await realType('03152026');
    await waitFor(() => expect(value('empty')).toHaveTextContent('2026-03-15'));
    // ArrowUp/Down step the focused segment (the year, after typing).
    await userEvent.keyboard('{ArrowUp}');
    await waitFor(() => expect(value('empty')).toHaveTextContent('2027-03-15'));
    await userEvent.keyboard('{ArrowLeft}{ArrowDown}');
    await waitFor(() => expect(value('empty')).toHaveTextContent('2027-03-14'));

    const time = canvas.getByRole('group', { name: 'Starts at' });
    await userEvent.click(within(time).getAllByRole('spinbutton')[0]);
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(value('time')).toHaveTextContent('08:30'));
    await realType('1745');
    await waitFor(() => expect(value('time')).toHaveTextContent('17:45'));

    const datetime = canvas.getByRole('group', { name: 'Reminder' });
    await userEvent.click(within(datetime).getAllByRole('spinbutton')[3]);
    await userEvent.keyboard('{ArrowUp}');
    await waitFor(() => expect(value('datetime')).toHaveTextContent('2026-09-29T10:30'));

    // Read-only segments do not step.
    const locked = canvas.getByRole('group', { name: 'Locked' });
    await expect(within(locked).getAllByRole('spinbutton')[0]).toHaveAttribute('aria-readonly', 'true');
    await userEvent.click(within(locked).getAllByRole('spinbutton')[0]);
    await userEvent.keyboard('{ArrowUp}');
    await expect(value('readonly')).toHaveTextContent('2026-09-29');

    for (const segment of within(canvas.getByRole('group', { name: 'Overdue' })).getAllByRole('spinbutton')) {
      await expect(segment).toHaveAttribute('aria-invalid', 'true');
    }
    for (const segment of within(canvas.getByRole('group', { name: 'Archived' })).getAllByRole('spinbutton')) {
      await expect(segment).toHaveAttribute('aria-disabled', 'true');
    }
    await expect(getComputedStyle(byTestId(md, 'disabled-md')).opacity).toBe('0.5');
    await expect(within(byTestId(md, 'disabled-md')).getByRole('button', { name: 'Pick a date' })).toBeDisabled();
    // A time has no calendar.
    await expect(within(byTestId(md, 'time-md')).queryByRole('button')).toBeNull();

    // The calendar opens below the row; min/max disable days outside the window; a day click sets the date.
    const windowRow = byTestId(md, 'window-md');
    await userEvent.click(within(windowRow).getByRole('button', { name: 'Pick a date' }));
    const calendar = await waitFor(() => byTestId(canvasElement.ownerDocument.body, 'window-md-calendar'));
    await waitFor(() => expect(calendar).toBeVisible());
    await expectAnchoredBelow(windowRow, calendar);
    const day = (date: string, root = calendar) => {
      const cell = root.querySelector<HTMLElement>(`[data-part="table-cell-trigger"][data-value="${date}"]`);
      if (!cell) {
        throw new Error(`missing day ${date}`);
      }
      return cell;
    };
    await expect(day('2026-09-05')).toHaveAttribute('data-disabled');
    await expect(day('2026-09-25')).toHaveAttribute('data-disabled');
    await expect(day('2026-09-15')).toHaveAttribute('data-selected');
    await userEvent.click(day('2026-09-12'));
    await waitFor(() => expect(value('window')).toHaveTextContent('2026-09-12'));
    // The calendar unmounts once it closes.
    await waitFor(() =>
      expect(canvasElement.ownerDocument.querySelector('[data-testid="window-md-calendar"]')).toBeNull(),
    );

    // A date-time keeps its time when the calendar picks a day; the calendar is left open for inspection.
    await userEvent.click(within(byTestId(md, 'datetime-md')).getByRole('button', { name: 'Pick a date' }));
    const datetimeCalendar = await waitFor(() => byTestId(canvasElement.ownerDocument.body, 'datetime-md-calendar'));
    await userEvent.click(day('2026-09-03', datetimeCalendar));
    await waitFor(() => expect(value('datetime')).toHaveTextContent('2026-09-03T10:30'));
    await userEvent.click(within(byTestId(md, 'datetime-md')).getByRole('button', { name: 'Pick a date' }));
    await waitFor(() => expect(byTestId(canvasElement.ownerDocument.body, 'datetime-md-calendar')).toBeVisible());
  },
};

//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { translations } from '#translations';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, byTestId, controlSize, expectPopupSize, expectScoped, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
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
    <ValueField label='Due' testId={`date-${size}`} defaultValue='2026-09-29' />
    <Next.Input aria-label='Note' data-testid={`input-${size}`} />
    <ValueField label='Starts at' testId={`time-${size}`} type='time' defaultValue='09:30' />
    <ValueField label='Reminder' testId={`datetime-${size}`} type='datetime-local' defaultValue='2026-09-29T09:30' />
    <ValueField label='Empty' testId={`empty-${size}`} />
    <ValueField label='Alarm' testId={`alarm-${size}`} type='time' hourCycle={12} />
    <ValueField
      label='Window'
      testId={`window-${size}`}
      size='lg'
      min='2026-09-10'
      max='2026-09-20'
      defaultValue='2026-09-15'
    />
    <ValueField label='Datum' testId={`locale-${size}`} locale='de-DE' defaultValue='2026-09-29' />
    <ValueField label='Locked' testId={`readonly-${size}`} defaultValue='2026-09-29' fieldProps={{ readOnly: true }} />
    <ValueField label='Overdue' testId={`invalid-${size}`} defaultValue='2026-01-01' fieldProps={{ invalid: true }} />
    <ValueField
      label='Archived'
      testId={`disabled-${size}`}
      defaultValue='2026-09-29'
      fieldProps={{ disabled: true }}
    />
  </>
);

const meta = {
  title: 'ui/react-ui-core/next/components/DateInput',
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
 * Types with the runner's real keyboard: zag reads digits from React's `onBeforeInput`, which the browser raises from
 * trusted key presses (`textInput`) but not from synthetic ones.
 */
const realType = async (text: string) => {
  const { userEvent: keyboard } = await import('vitest/browser');
  await keyboard.keyboard(text);
};

/** The open calendar of the DateInput with this test id, once it is positioned. */
const openCalendar = async (root: HTMLElement, testId: string) => {
  await userEvent.click(within(byTestId(root, testId)).getByRole('button', { name: 'Pick a date' }));
  const calendar = await waitFor(() => byTestId(root.ownerDocument.body, `${testId}-calendar`));
  await waitFor(() => expect(calendar).toBeVisible());
  return calendar;
};

/**
 * Waits until the calendar hangs 0–3px below the row with its end at the row's (and so its trigger's) end, and returns
 * its width.
 */
const expectEndAnchored = async (row: HTMLElement, calendar: HTMLElement) => {
  await waitFor(async () => {
    const rowRect = row.getBoundingClientRect();
    const rect = calendar.getBoundingClientRect();
    const where = `calendar ${JSON.stringify(rect)}, row ${JSON.stringify(rowRect)}`;
    await expect(rect.top - rowRect.bottom >= 0 && rect.top - rowRect.bottom <= 3, `gap: ${where}`).toBe(true);
    await expect(Math.abs(rect.right - rowRect.right) <= 1, `end: ${where}`).toBe(true);
  });
  return calendar.getBoundingClientRect().width;
};

const segmentTypes = (group: HTMLElement) =>
  within(group)
    .getAllByRole('spinbutton')
    .map((segment) => segment.dataset.type);

/**
 * The row is a control at every size, as wide as an Input; segments are spinbuttons named by the Field label and
 * ordered by the locale; typing digits fills and advances segments, ArrowUp/Down step one, and the field reports the
 * native value format. The trailing trigger opens the calendar below the row, ending at the trigger, at its own width
 * (seven square block-sized days) whatever the field's width; a day click sets the date and min/max disable days
 * outside the window. Read-only, invalid and disabled come from `Field.Root`.
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

    // Clicking the Field label focuses the first segment, not the hidden input the label points at.
    await userEvent.click(canvas.getByText('Due', { selector: 'label' }));
    await expect(within(due).getAllByRole('spinbutton')[0]).toHaveFocus();

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

    // At every size the calendar keeps its own width, seven square block-sized days plus its padding, ending under
    // the trigger; narrowing the field leaves that width unchanged.
    for (const size of SIZES) {
      const row = byTestId(canvasElement, `date-${size}`);
      const block = GEOMETRY[size].block;
      let calendar = await openCalendar(canvasElement, `date-${size}`);
      const style = getComputedStyle(calendar);
      const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      // The calendar takes the field row's size (Phase 4 decision 2).
      await expectPopupSize(calendar, size);
      const width = await expectEndAnchored(row, calendar);
      await expect(width, `${size} calendar width`).toBeCloseTo(7 * block + padding, 0);
      await expect(width, `${size} calendar narrower than the field`).toBeLessThan(row.getBoundingClientRect().width);
      for (const cell of calendar.querySelectorAll<HTMLElement>('[data-part="table-cell-trigger"][data-view="day"]')) {
        const rect = cell.getBoundingClientRect();
        await expect(rect.width, `${size} day width`).toBeCloseTo(block, 0);
        await expect(rect.height, `${size} day height`).toBeCloseTo(block, 0);
      }
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(row.ownerDocument.querySelector(`[data-testid="date-${size}-calendar"]`)).toBeNull());

      // Narrower, but with room for the calendar at its end, so the placement need not shift it.
      row.style.width = `${width + block}px`;
      calendar = await openCalendar(canvasElement, `date-${size}`);
      await expect(await expectEndAnchored(row, calendar), `${size} width follows no field`).toBeCloseTo(width, 0);
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(row.ownerDocument.querySelector(`[data-testid="date-${size}-calendar"]`)).toBeNull());
      row.style.width = '';
    }

    // min/max disable days outside the window; a day click sets the date.
    const windowRow = byTestId(md, 'window-md');
    const calendar = await openCalendar(md, 'window-md');
    await expectEndAnchored(windowRow, calendar);
    // An explicit size wins over the inherited one.
    await expectPopupSize(calendar, 'lg');
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
    const datetimeCalendar = await openCalendar(md, 'datetime-md');
    const datetimeStyle = getComputedStyle(datetimeCalendar);
    await expect(await expectEndAnchored(byTestId(md, 'datetime-md'), datetimeCalendar)).toBeCloseTo(
      7 * GEOMETRY.md.block + parseFloat(datetimeStyle.paddingLeft) + parseFloat(datetimeStyle.paddingRight),
      0,
    );
    await userEvent.click(day('2026-09-03', datetimeCalendar));
    await waitFor(() => expect(value('datetime')).toHaveTextContent('2026-09-03T10:30'));
    await userEvent.click(within(byTestId(md, 'datetime-md')).getByRole('button', { name: 'Pick a date' }));
    await waitFor(() => expect(byTestId(canvasElement.ownerDocument.body, 'datetime-md-calendar')).toBeVisible());
  },
};

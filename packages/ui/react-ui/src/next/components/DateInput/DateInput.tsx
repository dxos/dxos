//
// Copyright 2026 DXOS.org
//

import { DateInput as DateInputPrimitive, useDateInput } from '@ark-ui/react/date-input';
import { DatePicker as DatePickerPrimitive, useDatePicker } from '@ark-ui/react/date-picker';
import { useFieldContext } from '@ark-ui/react/field';
import { useLocaleContext } from '@ark-ui/react/locale';
import { type DateValue, toCalendarDate } from '@internationalized/date';
import React, { type ReactNode, type RefObject, forwardRef, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useControllableState } from '@dxos/react-hooks';
import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { Button } from '../Button/index.ts';
import { LABEL_TARGET_ATTRIBUTE } from '../Field/index.ts';
import {
  type DateInputGranularity,
  type DateInputType,
  TIME_ZONE,
  baseDate,
  formatValue,
  parseValue,
  timeFormat,
  withDay,
} from './date-value.ts';
import { DateCalendar } from './DateCalendar.tsx';

export type { DateInputGranularity, DateInputType };

export type DateInputProps = ThemedClassName<{
  'type'?: DateInputType;
  /** `YYYY-MM-DD`, `HH:mm` or `YYYY-MM-DDTHH:mm` (with `:ss` at `second` granularity); empty when unset. */
  'value'?: string;
  'defaultValue'?: string;
  'onValueChange'?: (value: string) => void;
  /** Earliest value, in the type's format; earlier segments clamp and earlier calendar days are disabled. */
  'min'?: string;
  'max'?: string;
  /** Smallest time unit of a `time` or `datetime-local` field (`minute` by default). */
  'granularity'?: DateInputGranularity;
  /** `24` (default) shows HH:mm; `12` adds an AM/PM segment. */
  'hourCycle'?: 12 | 24;
  /** BCP 47 locale that orders the segments; defaults to Ark's `LocaleProvider` (en-US). */
  'locale'?: string;
  /** A calendar behind a trailing trigger (`date` and `datetime-local` only; on by default). */
  'picker'?: boolean;
  /** Overrides the calendar's size, otherwise inherited from the row's nearest sized ancestor (Phase 4 decision 2). */
  'size'?: Size;
  /** Portals the calendar into this element instead of the body. */
  'container'?: RefObject<HTMLElement | null>;
  'disabled'?: boolean;
  'readOnly'?: boolean;
  'required'?: boolean;
  'invalid'?: boolean;
  /** Submitted by a hidden input, in the value format. */
  'name'?: string;
  'form'?: string;
  /** Names the segments when there is no enclosing `Field.Label`. */
  'aria-label'?: string;
  'data-testid'?: string;
  /** Extra trailing content in the control row, after the calendar trigger. */
  'end'?: ReactNode;
}>;

/**
 * Segmented date, time or date-time entry (zag `date-input`): each part is a spinbutton, ordered by the locale, typed
 * digit by digit or stepped with the arrow keys. `date` and `datetime-local` add a calendar (zag `date-picker`) behind
 * a trailing trigger, sharing the value. Inside a `Field.Root` the segments take the field's label, description and
 * invalid/disabled/read-only state. `data-testid` and the ref go to the control row.
 */
export const DateInput = forwardRef<HTMLDivElement, DateInputProps>(
  (
    {
      classNames,
      type = 'date',
      value: valueProp,
      defaultValue,
      onValueChange,
      min: minProp,
      max: maxProp,
      granularity: granularityProp,
      hourCycle = 24,
      locale: localeProp,
      picker: pickerProp = true,
      size,
      container,
      disabled,
      readOnly,
      required,
      invalid,
      name,
      form,
      'aria-label': ariaLabel,
      'data-testid': testId,
      end,
    },
    forwardedRef,
  ) => {
    const { t } = useTranslation(translationKey);
    const field = useFieldContext();
    const { locale: contextLocale } = useLocaleContext();
    const locale = localeProp ?? contextLocale;
    const picker = pickerProp && type !== 'time';
    const granularity = type === 'date' ? 'day' : (granularityProp ?? 'minute');
    const [base] = useState(baseDate);

    const [stringValue, setStringValue] = useControllableState<string>({
      prop: valueProp,
      defaultProp: defaultValue ?? '',
      onChange: onValueChange,
    });

    const current = parseValue(type, stringValue, base);
    const min = parseValue(type, minProp, base);
    const max = parseValue(type, maxProp, base);
    const commit = (next: DateValue | undefined) =>
      setStringValue(next ? formatValue(type, next, granularity === 'day' ? 'minute' : granularity) : '');

    const time = useMemo(
      () =>
        type === 'time' ? timeFormat(locale, granularity === 'day' ? 'minute' : granularity, hourCycle) : undefined,
      [type, locale, granularity, hourCycle],
    );

    const dateInput = useDateInput({
      locale,
      timeZone: TIME_ZONE,
      granularity,
      hourCycle,
      shouldForceLeadingZeros: true,
      value: current ? [current] : [],
      onValueChange: ({ value: [next] }) => commit(next),
      min,
      max,
      defaultPlaceholderValue: type === 'time' ? (current ?? parseValue('time', '00:00', base)) : undefined,
      ...(time && { formatter: time.formatter, allSegments: time.allSegments }),
      format: (date) => formatValue(type, date, granularity === 'day' ? 'minute' : granularity),
      ids: {
        ...(field && { label: () => field.ids.label, hiddenInput: () => field.ids.control }),
      },
      disabled: disabled ?? field?.disabled,
      readOnly: readOnly ?? field?.readOnly,
      required: required ?? field?.required,
      invalid: invalid ?? field?.invalid,
      name,
      form,
    });

    const datePicker = useDatePicker({
      locale,
      timeZone: TIME_ZONE,
      selectionMode: 'single',
      value: current ? [toCalendarDate(current)] : [],
      onValueChange: ({ value: [day] }) => day && commit(withDay(type, current, day)),
      min: min && toCalendarDate(min),
      max: max && toCalendarDate(max),
      disabled: dateInput.disabled,
      readOnly: readOnly ?? field?.readOnly,
      // The calendar ends under its trigger at its own width; Ark's 8px gutter reads as detached.
      positioning: { placement: 'bottom-end', gutter: 2 },
    });

    const segmentList = dateInput.getSegments();
    const firstEditable = segmentList.findIndex((segment) => segment.isEditable);
    const segments = (
      <DateInputPrimitive.Control className={recipes.dateInputSegments()}>
        <DateInputPrimitive.SegmentGroup
          aria-label={ariaLabel}
          aria-describedby={field?.ariaDescribedby}
          className={recipes.dateInputSegmentGroup()}
        >
          {segmentList.map((segment, index) => (
            <DateInputPrimitive.Segment
              key={index}
              segment={segment}
              {...(index === firstEditable && { [LABEL_TARGET_ATTRIBUTE]: '' })}
              className={recipes.dateInputSegment()}
            />
          ))}
        </DateInputPrimitive.SegmentGroup>
      </DateInputPrimitive.Control>
    );

    const trigger = picker && (
      <DatePickerPrimitive.Trigger asChild>
        <Button
          icon={type === 'date' ? 'ph--calendar-blank--regular' : 'ph--calendar-dots--regular'}
          label={t('date-picker.placeholder.single.label')}
          iconOnly
          variant='ghost'
          showTooltip={false}
        />
      </DatePickerPrimitive.Trigger>
    );

    const adornment = (trigger || end != null) && (
      <span data-scope='date-input' data-part='end' className={recipes.inputAdornment()}>
        {trigger}
        {end}
      </span>
    );

    const rowClassName = mx(recipes.dateInput(), classNames);
    const input = (
      <DateInputPrimitive.RootProvider value={dateInput} className={recipes.dateField()}>
        {picker ? (
          <DatePickerPrimitive.Control data-testid={testId} className={rowClassName} ref={forwardedRef}>
            {segments}
            {adornment}
          </DatePickerPrimitive.Control>
        ) : (
          <div data-scope='date-input' data-part='row' data-testid={testId} className={rowClassName} ref={forwardedRef}>
            {segments}
            {adornment}
          </div>
        )}
        <DateInputPrimitive.HiddenInput />
      </DateInputPrimitive.RootProvider>
    );

    if (!picker) {
      return input;
    }

    return (
      <DatePickerPrimitive.RootProvider value={datePicker} lazyMount unmountOnExit className={recipes.dateField()}>
        {input}
        <DateCalendar size={size} container={container} testId={testId && `${testId}-calendar`} />
      </DatePickerPrimitive.RootProvider>
    );
  },
);

DateInput.displayName = 'Next.DateInput';

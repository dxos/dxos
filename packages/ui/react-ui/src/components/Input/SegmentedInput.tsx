//
// Copyright 2026 DXOS.org
//

import { CalendarDate, CalendarDateTime, Time, parseDate, parseDateTime, parseTime } from '@internationalized/date';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { forwardRef, useCallback, useState } from 'react';
import {
  DateField,
  type DateFieldProps,
  DateInput,
  DateSegment,
  TimeField,
  type TimeFieldProps,
} from 'react-aria-components';

import { INPUT_NAME, type InputScopedProps, useInputContext } from '@dxos/react-input';

import { useDensityContext, useElevationContext, useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { DatePicker } from '../DatePicker';
import { Popover } from '../Popover';
import { type InputSharedProps, useInputTrigger } from './Input';

//
// Value <-> @internationalized/date adapters.
//

const tryParse = <T,>(parser: (input: string) => T, value: string | undefined): T | null => {
  if (!value) {
    return null;
  }
  try {
    return parser(value);
  } catch {
    return null;
  }
};

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

const formatCalendarDate = (date: CalendarDate): string => `${pad(date.year, 4)}-${pad(date.month)}-${pad(date.day)}`;

const formatCalendarDateTime = (datetime: CalendarDateTime): string =>
  `${pad(datetime.year, 4)}-${pad(datetime.month)}-${pad(datetime.day)}` +
  `T${pad(datetime.hour)}:${pad(datetime.minute)}`;

const formatTime = (time: Time): string => `${pad(time.hour)}:${pad(time.minute)}`;

const toCalendarDate = (date: Date) => new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());

//
// Theming.
//

const fieldClass = 'inline-flex items-center gap-px font-mono tabular-nums focus-within:bg-attention-surface';

const segmentClass =
  'rounded-xs px-0.5 outline-none ' +
  'data-[placeholder]:text-subdued data-[type=literal]:text-subdued ' +
  'data-[focused]:bg-attention-surface data-[focused]:text-base-foreground ' +
  'data-[invalid]:text-rose-500 ' +
  'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50';

//
// Shared props.
//

type SegmentedInputBaseProps = InputSharedProps &
  ThemedClassName<{
    id?: string;
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
    autoFocus?: boolean;
    'aria-label'?: string;
  }>;

//
// Internal helpers.
//

const useFieldChrome = ({
  __inputScope,
  density: densityProp,
  elevation: elevationProp,
}: {
  __inputScope?: any;
  density: InputSharedProps['density'];
  elevation: InputSharedProps['elevation'];
}) => {
  const { tx } = useThemeContext();
  const density = useDensityContext(densityProp);
  const elevation = useElevationContext(elevationProp);
  const { validationValence } = useInputContext(INPUT_NAME, __inputScope);
  return { tx, density, elevation, validationValence };
};

/**
 * Wraps a field with `Popover.Anchor` and a `DatePicker.Root` whose open state is driven by
 * the surrounding `Input.Root`'s registered trigger. `Input.TriggerIcon` (a sibling under
 * `Input.Root`) calls the registered handler on press; the popover anchors to this field.
 */
const PickerWrapper = ({
  pickerValue,
  onPickerChange,
  withTime,
  children,
  calendar,
}: {
  pickerValue: Date | undefined;
  onPickerChange: (next: Date | undefined) => void;
  withTime: boolean;
  children: React.ReactNode;
  calendar: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const openPicker = useCallback(() => setOpen(true), []);
  useInputTrigger(openPicker);
  return (
    <DatePicker.Root
      mode='single'
      withTime={withTime}
      value={pickerValue}
      onValueChange={onPickerChange}
      open={open}
      onOpenChange={setOpen}
    >
      <Popover.Anchor asChild>{children}</Popover.Anchor>
      <DatePicker.Content>{calendar}</DatePicker.Content>
    </DatePicker.Root>
  );
};

//
// SegmentedDate.
//

type SegmentedDateProps = SegmentedInputBaseProps;

const SegmentedDate = forwardRef<HTMLDivElement, InputScopedProps<SegmentedDateProps>>(
  (
    {
      __inputScope,
      classNames,
      density: densityProp,
      elevation: elevationProp,
      variant,
      value,
      defaultValue,
      onValueChange,
      disabled,
      autoFocus,
      id,
      'aria-label': ariaLabel,
    },
    forwardedRef,
  ) => {
    const { tx, density, elevation, validationValence } = useFieldChrome({
      __inputScope,
      density: densityProp,
      elevation: elevationProp,
    });

    const [stringValue, setStringValue] = useControllableState<string>({
      prop: value,
      defaultProp: defaultValue ?? '',
      onChange: onValueChange,
    });

    const parsed = tryParse(parseDate, stringValue);

    const fieldProps: DateFieldProps<CalendarDate> = {
      value: parsed,
      onChange: (next) => setStringValue(next ? formatCalendarDate(next) : ''),
      isDisabled: disabled,
      autoFocus,
      'aria-label': ariaLabel ?? 'date',
      granularity: 'day',
    };

    const field = (
      <DateField {...fieldProps}>
        <DateInput
          ref={forwardedRef}
          {...(id ? { id } : {})}
          data-density={density}
          className={tx(
            'input.input',
            { variant, disabled, density, elevation, validationValence },
            fieldClass,
            classNames,
          )}
        >
          {(segment) => <DateSegment segment={segment} className={segmentClass} />}
        </DateInput>
      </DateField>
    );

    return (
      <PickerWrapper
        pickerValue={parsed ? new Date(parsed.year, parsed.month - 1, parsed.day) : undefined}
        onPickerChange={(next) => setStringValue(next ? formatCalendarDate(toCalendarDate(next)) : '')}
        withTime={false}
        calendar={<DatePicker.Calendar />}
      >
        {field}
      </PickerWrapper>
    );
  },
);
SegmentedDate.displayName = 'Input.SegmentedDate';

//
// SegmentedTime — no picker (no time-only picker primitive available); does not register a trigger.
//

type SegmentedTimeProps = SegmentedInputBaseProps;

const SegmentedTime = forwardRef<HTMLDivElement, InputScopedProps<SegmentedTimeProps>>(
  (
    {
      __inputScope,
      classNames,
      density: densityProp,
      elevation: elevationProp,
      variant,
      value,
      defaultValue,
      onValueChange,
      disabled,
      autoFocus,
      id,
      'aria-label': ariaLabel,
    },
    forwardedRef,
  ) => {
    const { tx, density, elevation, validationValence } = useFieldChrome({
      __inputScope,
      density: densityProp,
      elevation: elevationProp,
    });

    const [stringValue, setStringValue] = useControllableState<string>({
      prop: value,
      defaultProp: defaultValue ?? '',
      onChange: onValueChange,
    });

    const parsed = tryParse(parseTime, stringValue);

    const fieldProps: TimeFieldProps<Time> = {
      value: parsed,
      onChange: (next) => setStringValue(next ? formatTime(next) : ''),
      isDisabled: disabled,
      autoFocus,
      'aria-label': ariaLabel ?? 'time',
      granularity: 'minute',
      hourCycle: 24,
    };

    return (
      <TimeField {...fieldProps}>
        <DateInput
          ref={forwardedRef}
          {...(id ? { id } : {})}
          data-density={density}
          className={tx(
            'input.input',
            { variant, disabled, density, elevation, validationValence },
            fieldClass,
            classNames,
          )}
        >
          {(segment) => <DateSegment segment={segment} className={segmentClass} />}
        </DateInput>
      </TimeField>
    );
  },
);
SegmentedTime.displayName = 'Input.SegmentedTime';

//
// SegmentedDateTime.
//

type SegmentedDateTimeProps = SegmentedInputBaseProps;

const SegmentedDateTime = forwardRef<HTMLDivElement, InputScopedProps<SegmentedDateTimeProps>>(
  (
    {
      __inputScope,
      classNames,
      density: densityProp,
      elevation: elevationProp,
      variant,
      value,
      defaultValue,
      onValueChange,
      disabled,
      autoFocus,
      id,
      'aria-label': ariaLabel,
    },
    forwardedRef,
  ) => {
    const { tx, density, elevation, validationValence } = useFieldChrome({
      __inputScope,
      density: densityProp,
      elevation: elevationProp,
    });

    const [stringValue, setStringValue] = useControllableState<string>({
      prop: value,
      defaultProp: defaultValue ?? '',
      onChange: onValueChange,
    });

    const parsed = tryParse(parseDateTime, stringValue);

    const fieldProps: DateFieldProps<CalendarDateTime> = {
      value: parsed,
      onChange: (next) => setStringValue(next ? formatCalendarDateTime(next) : ''),
      isDisabled: disabled,
      autoFocus,
      'aria-label': ariaLabel ?? 'date-time',
      granularity: 'minute',
      hourCycle: 24,
    };

    const field = (
      <DateField {...fieldProps}>
        <DateInput
          ref={forwardedRef}
          {...(id ? { id } : {})}
          data-density={density}
          className={tx(
            'input.input',
            { variant, disabled, density, elevation, validationValence },
            fieldClass,
            classNames,
          )}
        >
          {(segment) => <DateSegment segment={segment} className={segmentClass} />}
        </DateInput>
      </DateField>
    );

    return (
      <PickerWrapper
        pickerValue={
          parsed ? new Date(parsed.year, parsed.month - 1, parsed.day, parsed.hour, parsed.minute) : undefined
        }
        onPickerChange={(next) =>
          setStringValue(
            next
              ? formatCalendarDateTime(
                  new CalendarDateTime(
                    next.getFullYear(),
                    next.getMonth() + 1,
                    next.getDate(),
                    next.getHours(),
                    next.getMinutes(),
                  ),
                )
              : '',
          )
        }
        withTime
        calendar={<DatePicker.Calendar />}
      >
        {field}
      </PickerWrapper>
    );
  },
);
SegmentedDateTime.displayName = 'Input.SegmentedDateTime';

export { SegmentedDate, SegmentedTime, SegmentedDateTime };
export type { SegmentedDateProps, SegmentedTimeProps, SegmentedDateTimeProps };

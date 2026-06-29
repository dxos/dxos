//
// Copyright 2026 DXOS.org
//

import { CalendarDate, CalendarDateTime, Time, parseDate, parseDateTime, parseTime } from '@internationalized/date';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type ComponentProps, ReactNode, forwardRef, useCallback, useState } from 'react';
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

// TODO(burdon): Move to theme.
const fieldClassNames =
  'inline-flex flex-nowrap items-center gap-px whitespace-nowrap tabular-nums focus-within:bg-attention-surface';

// React Aria sets `caret-color: transparent` inline on each segment because spinbuttons replace
// the whole value rather than inserting at a caret position. We override with `!important` so a
// caret is visible while typing — friendlier UX even though it's slightly misleading mid-segment.
//
// `tabular-nums` on the field combined with `min-width` per segment keeps each segment a fixed
// width regardless of value (so e.g. month `1` and `12` occupy the same space). `text-align: end`
// right-aligns the digits within that fixed width.
// TODO(burdon): Move to Input.theme.ts
const segmentClassNames =
  'shrink-0 rounded-xs outline-none text-end [caret-color:currentColor]! ' +
  'data-[type=year]:min-w-[4ch] ' +
  'data-[type=month]:min-w-[1ch] data-[type=day]:min-w-[1ch] ' +
  'data-[type=hour]:min-w-[1ch] data-[type=minute]:min-w-[1ch] ' +
  'data-[placeholder]:text-subdued data-[type=literal]:text-subdued ' +
  'data-[focused]:bg-accent-bg data-[focused]:text-accent-fg ' +
  'data-[invalid]:text-rose-500 ' +
  'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50';

const timeSegmentClassNames = `${segmentClassNames} data-[type=dayPeriod]:text-xs data-[type=dayPeriod]:text-description`;

// Match bidi format characters (LRI/RLI/PDI/LRE/RLE/PDF/LRO/RLO) that React Aria inserts to
// isolate locale-formatted portions. These are invisible glyphs but the browser still gives
// them ~4px of width, which pushes the first visible character of time-only fields out of
// alignment with date fields. Keep them in the DOM (so directional isolation survives) but
// collapse them to zero width.
const BIDI_FORMAT_RE = /^[‪-‮⁦-⁩]+$/;

// The segment object react-aria passes to the `DateInput` render function and expects back on
// `DateSegment` — derived from the component so no extra dependency on `react-stately` is needed.
type DateSegmentData = ComponentProps<typeof DateSegment>['segment'];

/**
 * Render a single DateSegment. Locale-specific literals between date and time portions
 * (e.g. en-US's `", "`) become a plain space; bidi format markers are kept but rendered
 * zero-width so the visible content lines up at the field's left edge.
 */
const renderSegment = (segment: DateSegmentData, classNames = segmentClassNames) => {
  if (segment.type === 'literal') {
    if (BIDI_FORMAT_RE.test(segment.text)) {
      // Render as a fixed-width spacer (between date and time portions of a datetime field),
      // but hide when at the field's edges — opening LRI is the first child of a time-only
      // field and would push everything right; closing PDI is the last child everywhere.
      return <span aria-hidden className='select-none w-[1ch] first:hidden last:hidden' />;
    }
    if (segment.text.includes(',')) {
      return (
        <span aria-hidden className='select-none'>
          {' '}
        </span>
      );
    }
  }

  return <DateSegment segment={segment} className={classNames} />;
};

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

type SegmentedTimeBearingProps = SegmentedInputBaseProps & {
  /** `24` (default) renders HH:mm; `12` renders hh:mm with an AM/PM segment. */
  hourCycle?: 12 | 24;
};

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
  const { id: contextId, validationValence, descriptionId, errorMessageId } = useInputContext(INPUT_NAME, __inputScope);
  return { tx, density, elevation, validationValence, contextId, descriptionId, errorMessageId };
};

/**
 * Wraps a field with `Popover.Anchor` and a `DatePicker.Root` whose open state is driven by
 * the surrounding `Input.Root`'s registered trigger. `Input.TriggerIcon` (a sibling under
 * `Input.Root`) calls the registered handler on press; the popover anchors to this field.
 */
const PickerWrapper = ({
  children,
  pickerValue,
  withTime,
  disabled = false,
  calendar,
  onPickerChange,
}: {
  children: ReactNode;
  pickerValue: Date | undefined;
  withTime: boolean;
  disabled?: boolean;
  calendar: ReactNode;
  onPickerChange: (next: Date | undefined) => void;
}) => {
  const [open, setOpen] = useState(false);
  const openPicker = useCallback(() => {
    if (!disabled) {
      setOpen(true);
    }
  }, [disabled]);
  useInputTrigger(disabled ? undefined : openPicker);
  return (
    <DatePicker.Root
      mode='single'
      withTime={withTime}
      value={pickerValue}
      onValueChange={disabled ? undefined : onPickerChange}
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
    const { tx, density, elevation, validationValence, contextId, descriptionId, errorMessageId } = useFieldChrome({
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
      shouldForceLeadingZeros: true,
    };

    const field = (
      <DateField {...fieldProps}>
        <DateInput
          ref={forwardedRef}
          {...((id ?? contextId) ? { id: id ?? contextId } : {})}
          {...(descriptionId ? { 'aria-describedby': descriptionId } : {})}
          {...(validationValence === 'error' && errorMessageId
            ? { 'aria-invalid': true, 'aria-errormessage': errorMessageId }
            : {})}
          data-density={density}
          className={tx(
            'input.input',
            { variant, disabled, density, elevation, validationValence },
            fieldClassNames,
            classNames,
          )}
        >
          {renderSegment}
        </DateInput>
      </DateField>
    );

    return (
      <PickerWrapper
        pickerValue={parsed ? new Date(parsed.year, parsed.month - 1, parsed.day) : undefined}
        onPickerChange={(next) => setStringValue(next ? formatCalendarDate(toCalendarDate(next)) : '')}
        withTime={false}
        disabled={disabled}
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

type SegmentedTimeProps = SegmentedTimeBearingProps;

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
      hourCycle = 24,
      'aria-label': ariaLabel,
    },
    forwardedRef,
  ) => {
    const { tx, density, elevation, validationValence, contextId, descriptionId, errorMessageId } = useFieldChrome({
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
      hourCycle,
      shouldForceLeadingZeros: true,
    };

    return (
      <TimeField {...fieldProps}>
        <DateInput
          ref={forwardedRef}
          {...((id ?? contextId) ? { id: id ?? contextId } : {})}
          {...(descriptionId ? { 'aria-describedby': descriptionId } : {})}
          {...(validationValence === 'error' && errorMessageId
            ? { 'aria-invalid': true, 'aria-errormessage': errorMessageId }
            : {})}
          data-density={density}
          className={tx(
            'input.input',
            { variant, disabled, density, elevation, validationValence },
            fieldClassNames,
            classNames,
          )}
        >
          {(segment) => renderSegment(segment, timeSegmentClassNames)}
        </DateInput>
      </TimeField>
    );
  },
);
SegmentedTime.displayName = 'Input.SegmentedTime';

//
// SegmentedDateTime.
//

type SegmentedDateTimeProps = SegmentedTimeBearingProps;

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
      hourCycle = 24,
      'aria-label': ariaLabel,
    },
    forwardedRef,
  ) => {
    const { tx, density, elevation, validationValence, contextId, descriptionId, errorMessageId } = useFieldChrome({
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
      hourCycle,
      shouldForceLeadingZeros: true,
    };

    const field = (
      <DateField {...fieldProps}>
        <DateInput
          ref={forwardedRef}
          {...((id ?? contextId) ? { id: id ?? contextId } : {})}
          {...(descriptionId ? { 'aria-describedby': descriptionId } : {})}
          {...(validationValence === 'error' && errorMessageId
            ? { 'aria-invalid': true, 'aria-errormessage': errorMessageId }
            : {})}
          data-density={density}
          className={tx(
            'input.input',
            { variant, disabled, density, elevation, validationValence },
            fieldClassNames,
            classNames,
          )}
        >
          {renderSegment}
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
        disabled={disabled}
        calendar={<DatePicker.Calendar />}
      >
        {field}
      </PickerWrapper>
    );
  },
);
SegmentedDateTime.displayName = 'Input.SegmentedDateTime';

export { SegmentedDate, SegmentedDateTime, SegmentedTime };

export type { SegmentedDateProps, SegmentedDateTimeProps, SegmentedTimeProps };

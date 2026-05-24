//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { format as formatDate } from 'date-fns';
import React, {
  type ComponentPropsWithoutRef,
  type ReactNode,
  forwardRef,
  useCallback,
  useId,
  useState,
} from 'react';
import { type DateRange } from 'react-day-picker';

import { useThemeContext } from '../../hooks';
import { useTranslation } from '../../primitives';
import { translationKey } from '../../translations';
import { type ThemedClassName } from '../../util';
import { Calendar } from '../Calendar';
import { Popover } from '../Popover';

//
// Types & context.
//

export type DatePickerMode = 'single' | 'range' | 'multiple';

type ValueByMode = {
  single: Date | undefined;
  range: DateRange | undefined;
  multiple: Date[] | undefined;
};

type DatePickerContextValue = {
  mode: DatePickerMode;
  value: ValueByMode[DatePickerMode];
  setValue: (next: ValueByMode[DatePickerMode]) => void;
  withTime: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const [DatePickerProvider, useDatePickerContext] = createContext<DatePickerContextValue>('DatePicker');

//
// Root.
//

export type DatePickerRootProps<M extends DatePickerMode = 'single'> = {
  mode?: M;
  value?: ValueByMode[M];
  defaultValue?: ValueByMode[M];
  onValueChange?: (value: ValueByMode[M]) => void;
  withTime?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
};

const DatePickerRoot = <M extends DatePickerMode = 'single'>({
  mode = 'single' as M,
  value,
  defaultValue,
  onValueChange,
  withTime = false,
  open,
  defaultOpen,
  onOpenChange,
  children,
}: DatePickerRootProps<M>) => {
  const [internalValue, setInternalValue] = useState<ValueByMode[M] | undefined>(defaultValue);
  const [internalOpen, setInternalOpen] = useState(defaultOpen ?? false);

  const controlled = value !== undefined || onValueChange !== undefined;
  const resolvedValue = (controlled ? value : internalValue) as ValueByMode[DatePickerMode];

  const setValue = useCallback(
    (next: ValueByMode[DatePickerMode]) => {
      if (!controlled) {
        setInternalValue(next as ValueByMode[M] | undefined);
      }
      onValueChange?.(next as ValueByMode[M]);
    },
    [controlled, onValueChange],
  );

  const resolvedOpen = open ?? internalOpen;
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (open === undefined) {
        setInternalOpen(next);
      }
      onOpenChange?.(next);
    },
    [open, onOpenChange],
  );

  return (
    <DatePickerProvider
      mode={mode as DatePickerMode}
      value={resolvedValue}
      setValue={setValue}
      withTime={withTime}
      open={resolvedOpen}
      onOpenChange={handleOpenChange}
    >
      <Popover.Root open={resolvedOpen} onOpenChange={handleOpenChange}>
        {children}
      </Popover.Root>
    </DatePickerProvider>
  );
};

//
// Trigger.
//

const formatValue = (mode: DatePickerMode, value: unknown, fmt: string): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  switch (mode) {
    case 'single':
      return formatDate(value as Date, fmt);
    case 'range': {
      const r = value as DateRange;
      if (!r.from) {
        return undefined;
      }
      return r.to ? `${formatDate(r.from, fmt)} – ${formatDate(r.to, fmt)}` : formatDate(r.from, fmt);
    }
    case 'multiple': {
      const arr = value as Date[];
      return arr.length ? arr.map((date) => formatDate(date, fmt)).join(', ') : undefined;
    }
  }
};

export type DatePickerTriggerProps = ThemedClassName<Omit<ComponentPropsWithoutRef<'button'>, 'children'>> & {
  format?: string;
  placeholder?: string;
  children?: ReactNode | ((args: { value: ValueByMode[DatePickerMode]; label: string }) => ReactNode);
};

const DatePickerTrigger = forwardRef<HTMLButtonElement, DatePickerTriggerProps>(
  ({ classNames, format: fmt = 'PPP', placeholder, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { t } = useTranslation(translationKey);
    const { mode, value } = useDatePickerContext('DatePickerTrigger');

    const placeholderText = placeholder ?? (t(`date-picker.placeholder.${mode}.label`) as string);
    const label = formatValue(mode, value, fmt) ?? placeholderText;
    const hasValue = label !== placeholderText;

    return (
      <Popover.Trigger asChild>
        <button
          ref={forwardedRef}
          type='button'
          {...props}
          className={tx('datePicker.trigger', { hasValue }, classNames) ?? undefined}
        >
          {typeof children === 'function' ? children({ value, label }) : (children ?? label)}
        </button>
      </Popover.Trigger>
    );
  },
);
DatePickerTrigger.displayName = 'DatePickerTrigger';

//
// Content.
//

export type DatePickerContentProps = ThemedClassName<ComponentPropsWithoutRef<typeof Popover.Content>>;

const DatePickerContent = forwardRef<HTMLDivElement, DatePickerContentProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <Popover.Portal>
        <Popover.Content ref={forwardedRef} align='start' sideOffset={4} {...props}>
          <div className={tx('datePicker.content', {}, classNames)}>{children}</div>
        </Popover.Content>
      </Popover.Portal>
    );
  },
);
DatePickerContent.displayName = 'DatePickerContent';

//
// Calendar bound to context (time-of-day preservation).
//

/** Copies the hour/minute from oldDate into a fresh copy of newDate. */
const carryTime = (oldDate: Date | undefined, newDate: Date | undefined): Date | undefined => {
  if (!newDate) {
    return newDate;
  }
  if (!oldDate) {
    return newDate;
  }
  const out = new Date(newDate);
  out.setHours(oldDate.getHours(), oldDate.getMinutes(), 0, 0);
  return out;
};

type DatePickerCalendarProps = {
  classNames?: ComponentPropsWithoutRef<typeof Calendar.Root>['classNames'];
  slots?: ComponentPropsWithoutRef<typeof Calendar.Root>['slots'];
};

const DatePickerCalendar = (props: DatePickerCalendarProps) => {
  const { mode, value, setValue, withTime } = useDatePickerContext('DatePickerCalendar');

  const handleSelect = useCallback(
    (next: ValueByMode[DatePickerMode]) => {
      if (!withTime) {
        setValue(next);
        return;
      }
      if (mode === 'single') {
        setValue(carryTime(value as Date | undefined, next as Date | undefined));
      } else if (mode === 'range') {
        const oldRange = value as DateRange | undefined;
        const newRange = next as DateRange | undefined;
        setValue(
          newRange
            ? { from: carryTime(oldRange?.from, newRange.from)!, to: carryTime(oldRange?.to, newRange.to) }
            : undefined,
        );
      } else {
        // Multiple — react-day-picker emits the full array; preserve time on existing dates by index.
        const oldDates = (value as Date[] | undefined) ?? [];
        const newDates = (next as Date[] | undefined) ?? [];
        const merged = newDates.map((date, index) => carryTime(oldDates[index], date) ?? date);
        setValue(merged);
      }
    },
    [withTime, mode, value, setValue],
  );

  // Branch on mode so each Calendar render targets a single DayPickerProps union member.
  if (mode === 'single') {
    return <Calendar.Root {...props} mode='single' selected={value as Date | undefined} onSelect={handleSelect as (date: Date | undefined) => void} />;
  }
  if (mode === 'range') {
    return <Calendar.Root {...props} mode='range' selected={value as DateRange | undefined} onSelect={handleSelect as (range: DateRange | undefined) => void} />;
  }
  return <Calendar.Root {...props} mode='multiple' selected={value as Date[] | undefined} onSelect={handleSelect as (dates: Date[] | undefined) => void} />;
};
DatePickerCalendar.displayName = 'DatePickerCalendar';

//
// TimeField — native <input type='time'>; only renders when withTime is on.
//

export type DatePickerTimeFieldProps = ThemedClassName<
  Omit<ComponentPropsWithoutRef<'div'>, 'children'>
> & {
  /** For range mode: which endpoint to bind to. Defaults to 'from'. */
  endpoint?: 'from' | 'to';
};

const pad = (num: number) => num.toString().padStart(2, '0');
const toTimeValue = (date: Date | undefined): string =>
  date ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : '';

const DatePickerTimeField = forwardRef<HTMLDivElement, DatePickerTimeFieldProps>(
  ({ classNames, endpoint = 'from', ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { mode, value, setValue, withTime } = useDatePickerContext('DatePickerTimeField');
    const id = useId();

    if (!withTime) {
      return null;
    }

    let current: Date | undefined;
    if (mode === 'single') {
      current = value as Date | undefined;
    } else if (mode === 'range') {
      current = (value as DateRange | undefined)?.[endpoint];
    } else {
      const arr = value as Date[] | undefined;
      current = arr && arr.length ? arr[arr.length - 1] : undefined;
    }

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const parts = event.target.value.split(':');
      const hours = parseInt(parts[0] ?? '', 10);
      const minutes = parseInt(parts[1] ?? '', 10);
      const base = current ? new Date(current) : new Date();
      base.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
      if (mode === 'single') {
        setValue(base);
      } else if (mode === 'range') {
        const range = (value as DateRange | undefined) ?? { from: base };
        setValue({ ...range, [endpoint]: base } as DateRange);
      } else {
        const arr = ((value as Date[] | undefined) ?? []).slice();
        if (arr.length === 0) {
          arr.push(base);
        } else {
          arr[arr.length - 1] = base;
        }
        setValue(arr);
      }
    };

    return (
      <div ref={forwardedRef} {...props} className={tx('datePicker.timeField', {}, classNames)}>
        <label htmlFor={id} className='text-xs text-description'>
          {mode === 'range' ? endpoint : 'time'}
        </label>
        <input id={id} type='time' value={toTimeValue(current)} onChange={handleChange} />
      </div>
    );
  },
);
DatePickerTimeField.displayName = 'DatePickerTimeField';

//
// Public namespace.
//

export const DatePicker = {
  Root: DatePickerRoot,
  Trigger: DatePickerTrigger,
  Content: DatePickerContent,
  Calendar: DatePickerCalendar,
  TimeField: DatePickerTimeField,
};

export { useDatePickerContext };
export type { ValueByMode };

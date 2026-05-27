//
// Copyright 2026 DXOS.org
//

import { CalendarDate, parseDate } from '@internationalized/date';
import { createContext } from '@radix-ui/react-context';
import { format as formatDate } from 'date-fns';
import React, {
  type ComponentPropsWithoutRef,
  type PropsWithChildren,
  type ReactNode,
  forwardRef,
  useCallback,
  useState,
} from 'react';

import { useThemeContext } from '../../hooks';
import { useTranslation } from '../../primitives';
import { translationKey } from '../../translations';
import { type ThemedClassName } from '../../util';
import { Calendar, type DateRange } from '../Calendar';
import { Icon } from '../Icon';
import { Popover } from '../Popover';

//
// Public API.
//
// Wraps the new react-aria-components-backed `<Calendar>` (single + range) in a Radix Popover,
// preserving the previous slot-style namespace: `<DatePicker.Root>`, `<DatePicker.Trigger>`,
// `<DatePicker.Content>`, `<DatePicker.Calendar>`. Multi-select is no longer supported (no
// in-repo consumers); use `<Calendar.Root>` directly with custom state if needed.
//

export type DatePickerMode = 'single' | 'range';

type ValueByMode = {
  single: Date | undefined;
  range: DateRange | undefined;
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
  /** Preserve hour/minute on the selected date(s) when picking a new day. */
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
  }
};

export type DatePickerTriggerProps = ThemedClassName<Omit<ComponentPropsWithoutRef<'button'>, 'children'>> &
  PropsWithChildren<{
    format?: string;
    placeholder?: string;
    /** Show the leading calendar icon in the default trigger. Defaults to true. */
    icon?: boolean;
  }>;

const DatePickerTrigger = forwardRef<HTMLButtonElement, DatePickerTriggerProps>(
  ({ classNames, format: fmt = 'PPP', placeholder, icon = true, children, ...props }, forwardedRef) => {
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
          {children ?? (
            <>
              {icon && <Icon size={4} icon='ph--calendar--regular' />}
              {label}
            </>
          )}
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
// Calendar — single or range, time-of-day preservation, auto-dismiss on completion.
//

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

const DatePickerCalendar = (_props: { classNames?: string }) => {
  const { mode, value, setValue, withTime, onOpenChange } = useDatePickerContext('DatePickerCalendar');

  if (mode === 'single') {
    const date = value as Date | undefined;
    return (
      <Calendar.Root
        mode='single'
        selected={date}
        onSelect={(next) => {
          const merged = withTime ? carryTime(date, next) : next;
          setValue(merged);
          if (next !== undefined) {
            onOpenChange(false);
          }
        }}
      />
    );
  }

  const range = value as DateRange | undefined;
  return (
    <Calendar.Root
      mode='range'
      selected={range}
      onSelect={(next) => {
        if (!next) {
          setValue(undefined);
          return;
        }
        const merged: DateRange = withTime
          ? { from: carryTime(range?.from, next.from)!, to: carryTime(range?.to, next.to) }
          : next;
        setValue(merged);
        if (merged.from && merged.to) {
          onOpenChange(false);
        }
      }}
    />
  );
};

DatePickerCalendar.displayName = 'DatePickerCalendar';

//
// Public namespace.
//

export const DatePicker = {
  Root: DatePickerRoot,
  Trigger: DatePickerTrigger,
  Content: DatePickerContent,
  Calendar: DatePickerCalendar,
};

export { useDatePickerContext };

export type { ValueByMode };

// Re-export for convenience.
export { CalendarDate, parseDate };

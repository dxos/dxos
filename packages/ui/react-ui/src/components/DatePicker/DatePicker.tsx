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
      return arr.length ? arr.map((d) => formatDate(d, fmt)).join(', ') : undefined;
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
// Calendar bound to context (time-of-day preservation added in Task 8).
//

const DatePickerCalendar = forwardRef<
  HTMLDivElement,
  Omit<ComponentPropsWithoutRef<typeof Calendar>, 'mode' | 'selected' | 'onSelect'>
>(({ ...props }, forwardedRef) => {
  const { mode, value, setValue } = useDatePickerContext('DatePickerCalendar');
  const handleSelect = useCallback((next: ValueByMode[DatePickerMode]) => setValue(next), [setValue]);
  // Cast required because Calendar's DayPicker discriminated union cannot be narrowed at this call site.
  const dpProps = { mode, selected: value, onSelect: handleSelect } as unknown as ComponentPropsWithoutRef<typeof Calendar>;
  // Calendar's forwardRef wraps DayPicker which does not wire the ref to a DOM node; ref is accepted but intentionally unused.
  return <Calendar ref={forwardedRef as React.Ref<HTMLDivElement>} {...dpProps} {...props} />;
});
DatePickerCalendar.displayName = 'DatePickerCalendar';

//
// Public namespace (TimeField added in Task 8).
//

export const DatePicker = {
  Root: DatePickerRoot,
  Trigger: DatePickerTrigger,
  Content: DatePickerContent,
  Calendar: DatePickerCalendar,
};

export { useDatePickerContext };
export type { ValueByMode };

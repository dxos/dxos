//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';

import { type DatePickerMode, type ValueByMode } from './DatePicker.tsx';

// Kept out of `DatePicker.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export type DatePickerContextValue = {
  mode: DatePickerMode;
  value: ValueByMode[DatePickerMode];
  setValue: (next: ValueByMode[DatePickerMode]) => void;
  withTime: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const [DatePickerProvider, useDatePickerContext] = createContext<DatePickerContextValue>('DatePicker');

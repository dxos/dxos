//
// Copyright 2025 DXOS.org
//

// Shared by `Schedule.tsx` and `describe-schedule.ts`: a value import between those two would close a
// runtime cycle, and react-refresh only fast-refreshes a module whose exports are all components.

export const Days = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
] as const;

export type Day = (typeof Days)[number]['value'];

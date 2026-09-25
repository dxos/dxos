//
// Copyright 2026 DXOS.org
//

// Kept out of `Calendar.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a value exported beside them forces a full page reload on every edit.

/** The ISO date parser, re-exported for convenience alongside `Calendar`. */
export { parseDate as parseCalendarDate } from '@internationalized/date';

# DateTimePicker (react-ui-calendar)

Status: Draft
Date: 2026-05-24
Owner: claude/condescending-galileo-30f588

## Summary

A namespaced `DateTimePicker` primitive in `@dxos/react-ui-calendar` that composes the existing `Calendar.Grid` with a segmented editable input trigger and a popover that contains the calendar plus numeric time inputs. Supports six modes: `date`, `date-time`, `date-range`, `date-time-range`, `time`, `time-range`. Locale-aware (12h/24h, segment order). Controlled and uncontrolled.

## Motivation

We have `Calendar.Grid` (infinite virtualized scroller, single-day + drag-range selection, keyboard nav). We need a _form-field_ primitive on top of it for typical "pick a date/time" UX: a compact segmented input that behaves like the native `<input type="date">`, with a popover that opens via a calendar icon and lets the user pick day and time-of-day with an explicit commit.

## Non-goals

- Replacing `Calendar.Grid` or its current standalone use cases.
- Inline (non-popover) panel form. v1 is popover-only.
- Free-text natural-language date parsing ("next Tuesday").
- Recurrence / RRULE selection.
- Timezone selection UI. Component operates in the local timezone; callers normalize as needed.

## Architecture

`DateTimePicker` lives in `packages/ui/react-ui-calendar/src/components/DateTimePicker/` as a sibling of `Calendar/`. It composes (does not replace) `Calendar.Root` + `Calendar.Grid`.

### File layout

```
DateTimePicker/
  DateTimePicker.tsx        # namespace + Root/Input/Content/Time/Commit
  SegmentedInput.tsx        # generic segmented editable input (date + time)
  segments.ts               # segment definitions, locale order, parse/format
  segments.test.ts          # vitest unit tests
  useDateTimePicker.ts      # internal state hook
  util.ts                   # value coercion per mode, normalize
  util.test.ts              # vitest unit tests
  DateTimePicker.stories.tsx
  index.ts
```

### Composition

```
DateTimePicker.Root          # state, mode, controlled/uncontrolled value
  DateTimePicker.Input       # segmented input + calendar icon button (the trigger)
    (uses SegmentedInput internally)
  Popover.Root (from @dxos/react-ui)
    Popover.Trigger          # rendered by the calendar icon inside Input
    Popover.Content
      DateTimePicker.Content # layout: Calendar on top, Time at bottom
        Calendar.Root        # reused
          Calendar.Toolbar   # extended with prev/next month buttons (see below)
          Calendar.Grid rows={6}
        DateTimePicker.Time  # HH:MM (+ AM/PM if 12h) numeric inputs
        DateTimePicker.Commit # OK button; cancel = click-outside or Esc
```

### Dependencies

- `@dxos/react-ui` — Popover, Input, IconButton, Button.
- `date-fns` — already used by Calendar.
- No new external packages.

### Extending Calendar.Toolbar

`Calendar.Toolbar` currently has only a "today" icon. We add an optional `nav?: boolean` prop that renders prev/next month buttons. They emit `event.emit({ type: 'scroll', date })` like the today button. Default is `false`; existing callers are unaffected.

## Value model and public API

### Types

```ts
export type DateTimePickerMode = 'date' | 'date-time' | 'date-range' | 'date-time-range' | 'time' | 'time-range';

export type DateTimeRange = { from: Date; to: Date }; // alias of Calendar's Range

export type ValueFor<M extends DateTimePickerMode> = M extends 'date'
  ? Date
  : M extends 'date-time'
    ? Date
    : M extends 'date-range'
      ? DateTimeRange
      : M extends 'date-time-range'
        ? DateTimeRange
        : M extends 'time'
          ? Date
          : M extends 'time-range'
            ? DateTimeRange
            : never;
```

A single `Date` carries time even in `date` mode — we just zero the time component. Range modes reuse `Calendar`'s existing `Range` type.

### Root props

```ts
type DateTimePickerRootProps<M extends DateTimePickerMode> = {
  mode: M;
  // Controlled
  value?: ValueFor<M>;
  // Uncontrolled
  defaultValue?: ValueFor<M>;
  onValueChange?: (v: ValueFor<M>) => void;
  // Popover open state (controlled + uncontrolled)
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Time options
  step?: number; // minute step, default 15
  hourCycle?: 'h12' | 'h23'; // default: from locale
  locale?: string; // default: navigator.language
  // Forwarded to Calendar.Root
  weekStartsOn?: Day;
  disabled?: boolean;
};
```

### Commit semantics

- The popover holds a **draft** value internally; nothing fires until `Commit` is pressed.
- Clicking outside the popover or pressing Esc cancels (drops the draft).
- Typing in segments on the trigger writes directly to the committed value (segment edits are themselves commits, like native `<input type="date">`).
- Opening the popover seeds its draft from the current committed value.

### Component surface

```ts
DateTimePicker.Root; // generic on mode
DateTimePicker.Input; // segmented trigger (calendar icon is Popover.Trigger)
DateTimePicker.Content; // popover content wrapper
DateTimePicker.Time; // HH:MM (+ AM/PM); rendered inside Content
DateTimePicker.Commit; // OK button
```

For range modes, `Time` renders twice (start, end). The draft tracks which endpoint is being edited based on whichever of `from`/`to` the user last touched in the Grid.

## Data flow

```
                   trigger segments
   committed value ───────────────► (direct write on edit)
         ▲
         │ Commit click
         │
       draft value
         ▲
         ├── Calendar.Grid onSelect/onSelectRange  (draft.date)
         └── Time inputs                            (draft.time)
         ▲
         │
   open popover seeds draft from committed value
```

- `useDateTimePicker` returns `{ committed, draft, openState, setDraftDate, setDraftTime, commit, cancel, segments }`.
- Committed and draft are kept separate so cancel is a no-op on the committed value.
- The hook uses the controlled/uncontrolled pattern with internal state when `value` is undefined.

## Segmented input

`SegmentedInput` is a generic editable mask:

- Segments: `yyyy`, `MM`, `dd`, `hh` (12h) | `HH` (24h), `mm`, optional `a` (AM/PM).
- Segment order derived from `Intl.DateTimeFormat(locale).formatToParts(new Date())`.
- Per-segment state machine: empty → partial → filled. Tab/Shift+Tab move between segments. ArrowUp/ArrowDown increment/decrement (with overflow wrapping per segment). Typing digits fills the segment; auto-advances when the segment is unambiguously complete (e.g. typing 4 in the month tens place stays in segment because `4_` could be `4` or `4x` only if `x<10`; we auto-advance once unambiguous).
- The AM/PM segment is non-numeric; ArrowUp/Down toggles, A/P keys jump to the choice.
- Trigger renders one `SegmentedInput` for `time`/`time-only` modes, and one date + one time `SegmentedInput` for `date-time*` modes (range modes render two of whichever).
- A trailing calendar `IconButton` is the `Popover.Trigger`.

## Locale

- Default locale = `navigator.language`; caller can override via `locale` prop.
- Hour cycle = caller's `hourCycle` if set, else inferred from locale via `Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle`.
- Segment order derived from `formatToParts`.

## Error handling

- Invalid segment input (e.g. month = 13) is clamped on segment commit (blur or tab-away).
- If the controlled `value` is `undefined`, segments render empty placeholders (`yyyy`, `MM`, ...).
- Out-of-range time inputs (HH > 23 or MM > 59) clamp to nearest valid value.
- For range modes, if the user sets `from > to` via segments, the next commit normalizes (`makeRange`).
- The `Calendar.Grid` already handles its own keyboard nav and edge-scroll; we don't intercept.

## Testing

- **Storybook**: one story per mode (`date`, `date-time`, `date-range`, `date-time-range`, `time`, `time-range`), plus a controlled-vs-uncontrolled comparison story, plus a locale story showing `en-US` (12h) and `de-DE` (24h, dd.MM.yyyy).
- **Vitest** (`segments.test.ts`):
  - Locale ordering: `formatToParts` derives the expected segment order for several locales.
  - Parse/format round-trip for each mode.
  - Clamping for invalid inputs.
  - Auto-advance behaviour.
  - AM/PM toggle.
- **Vitest** (`util.test.ts`):
  - Mode-driven value coercion (zeroing time in `date` mode, etc.).
  - Range normalization (`from > to` swap).
- **Manual QA via Storybook**: popover open/close on icon click only, ESC cancels, click-outside cancels, OK commits, segment editing commits without opening popover.

## Open questions / follow-ups (post-v1)

- Min/max bounds and disabled-days predicate.
- Inline (non-popover) form.
- Promoting `DateTimePicker` from `@dxos/react-ui-calendar` into `@dxos/react-ui` once the API stabilises.
- A headless `useDateTimePicker` exported for fully custom rendering.

## Risks

- **Segmented input UX is non-trivial.** Native `input[type=date]` has years of polish; we are reimplementing it. We will mitigate by leaning on `Intl` for locale parts, by writing comprehensive unit tests for the parser, and by shipping storybook stories that exercise edge cases.
- **Calendar.Toolbar prop change is shared.** The added `nav` prop is opt-in and defaults to off, so existing usage is unaffected.

---

# Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `DateTimePicker` namespaced primitive in `@dxos/react-ui-calendar` covering the six modes defined above, with a segmented editable trigger and a popover composing the existing `Calendar.Grid`.

**Architecture:** Single namespaced component with a `mode` discriminator (Approach A). State lives in `useDateTimePicker`; segmented input is its own reusable building block driven by `Intl.DateTimeFormat.formatToParts`. Popover/Input/IconButton come from `@dxos/react-ui`; calendar from `Calendar.Root` + `Calendar.Grid`.

**Tech Stack:** TypeScript + React (forwardRef + Radix-style createContext), `@dxos/react-ui` (Popover, Input, IconButton, Button), `date-fns`, `Intl` for locale, vitest for unit tests, Storybook for visual.

**Working directory:** `packages/ui/react-ui-calendar/`.

**Test commands:**

- Unit tests for one file: `moon run react-ui-calendar:test -- src/components/DateTimePicker/segments.test.ts`
- All unit tests in package: `moon run react-ui-calendar:test`
- Lint+fix: `moon run react-ui-calendar:lint -- --fix`
- Build: `moon run react-ui-calendar:build`
- Storybook (visual): `moon run storybook-react:serve` then navigate to `ui/react-ui-calendar/DateTimePicker`.

**Commit cadence:** commit after each task passes its tests/lint. PR title must use conventional commits (`feat(react-ui-calendar): …`).

---

## Task 1: Extend `Calendar.Toolbar` with prev/next month nav

**Files:**

- Modify: `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx` (the `CalendarToolbar` component and `CalendarToolbarProps` type, around lines 165–204)
- Modify: `packages/ui/react-ui-calendar/src/translations.ts` (add `prev.button` / `next.button` keys)
- Modify: `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.stories.tsx` (add story exercising `<Calendar.Toolbar nav />`)

- [ ] **Step 1: Add translations**

Edit `packages/ui/react-ui-calendar/src/translations.ts`:

```ts
//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = '@dxos/react-ui-calendar';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'today.button': 'Today',
        'prev.button': 'Previous month',
        'next.button': 'Next month',
      },
    },
  },
] as const satisfies Resource[];
```

- [ ] **Step 2: Add `nav` prop and prev/next handlers to `CalendarToolbar`**

In `Calendar.tsx`, replace the `CalendarToolbarProps` type and the `CalendarToolbar` body. The new toolbar adds two `IconButton`s when `nav` is `true`. The "today" button keeps its existing position on the left; prev/next sit on the right.

```tsx
type CalendarToolbarProps = {
  /**
   * When `true`, render previous/next month buttons alongside the today button.
   * Defaults to `false` for backwards compatibility.
   */
  nav?: boolean;
};

const CalendarToolbar = composable<HTMLDivElement, CalendarToolbarProps>(
  ({ classNames, nav = false, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const { weekStartsOn, event, index, selected } = useCalendarContext(CALENDAR_TOOLBAR_NAME);
    const top = useMemo(() => getDate(start, index ?? 0, 6, weekStartsOn), [index, weekStartsOn]);
    const today = useMemo(() => new Date(), []);

    const handleToday = useCallback(() => {
      event.emit({ type: 'scroll', date: today });
    }, [event, today]);

    const handlePrev = useCallback(() => {
      const target = new Date(top.getFullYear(), top.getMonth() - 1, 1);
      event.emit({ type: 'scroll', date: target });
    }, [event, top]);

    const handleNext = useCallback(() => {
      const target = new Date(top.getFullYear(), top.getMonth() + 1, 1);
      event.emit({ type: 'scroll', date: target });
    }, [event, top]);

    return (
      <div
        {...composableProps(props, {
          role: 'none',
          classNames: ['shrink-0 grid! grid-cols-3 items-center bg-toolbar-surface', classNames],
        })}
        ref={forwardedRef}
        style={{ width: defaultWidth }}
      >
        <div className='flex justify-start'>
          <IconButton
            variant='ghost'
            icon='ph--calendar--regular'
            iconOnly
            classNames='aspect-square'
            label={t('today.button')}
            onClick={handleToday}
          />
        </div>
        <div className='flex justify-center p-2 text-description'>{format(selected ?? top, 'MMMM')}</div>
        <div className='flex justify-end items-center gap-1 p-2 text-description'>
          {nav && (
            <IconButton
              variant='ghost'
              icon='ph--caret-left--regular'
              iconOnly
              classNames='aspect-square'
              label={t('prev.button')}
              onClick={handlePrev}
            />
          )}
          <span>{(selected ?? top).getFullYear()}</span>
          {nav && (
            <IconButton
              variant='ghost'
              icon='ph--caret-right--regular'
              iconOnly
              classNames='aspect-square'
              label={t('next.button')}
              onClick={handleNext}
            />
          )}
        </div>
      </div>
    );
  },
);

CalendarToolbar.displayName = CALENDAR_TOOLBAR_NAME;
```

- [ ] **Step 3: Add a Storybook story exercising `nav`**

Append to `Calendar.stories.tsx`:

```tsx
export const WithNav: Story = {
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  render: () => (
    <Calendar.Root>
      <Calendar.Toolbar nav />
      <Calendar.Grid rows={6} />
    </Calendar.Root>
  ),
};
```

- [ ] **Step 4: Build, lint, run any existing tests**

Run:

```
moon run react-ui-calendar:lint -- --fix
moon run react-ui-calendar:build
moon run react-ui-calendar:test
```

Expected: all green. The build verifies the new translation keys don't break types and that the `IconButton` icons exist.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx \
        packages/ui/react-ui-calendar/src/components/Calendar/Calendar.stories.tsx \
        packages/ui/react-ui-calendar/src/translations.ts
git commit -m "feat(react-ui-calendar): add optional prev/next month nav to Calendar.Toolbar"
```

---

## Task 2: Scaffold `DateTimePicker` directory and types

**Files:**

- Create: `packages/ui/react-ui-calendar/src/components/DateTimePicker/types.ts`
- Create: `packages/ui/react-ui-calendar/src/components/DateTimePicker/index.ts`
- Modify: `packages/ui/react-ui-calendar/src/components/index.ts`

- [ ] **Step 1: Create the types module**

`packages/ui/react-ui-calendar/src/components/DateTimePicker/types.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { type Day } from 'date-fns';

import { type Range } from '../Calendar/Calendar';

export type DateTimePickerMode = 'date' | 'date-time' | 'date-range' | 'date-time-range' | 'time' | 'time-range';

export type DateTimeRange = Range;

export type ValueFor<M extends DateTimePickerMode> = M extends 'date'
  ? Date
  : M extends 'date-time'
    ? Date
    : M extends 'date-range'
      ? DateTimeRange
      : M extends 'date-time-range'
        ? DateTimeRange
        : M extends 'time'
          ? Date
          : M extends 'time-range'
            ? DateTimeRange
            : never;

export type HourCycle = 'h12' | 'h23';

export type DateTimePickerRootProps<M extends DateTimePickerMode> = {
  mode: M;
  value?: ValueFor<M>;
  defaultValue?: ValueFor<M>;
  onValueChange?: (value: ValueFor<M>) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Minute granularity. Default 15. */
  step?: number;
  /** 12h or 24h. Default: derived from `locale`. */
  hourCycle?: HourCycle;
  /** BCP-47 locale tag. Default: `navigator.language`. */
  locale?: string;
  /** Forwarded to Calendar.Root. Default 1 (Monday). */
  weekStartsOn?: Day;
  disabled?: boolean;
};

/** True for any mode whose value includes a time-of-day component. */
export const isTimeMode = (mode: DateTimePickerMode): boolean =>
  mode === 'date-time' || mode === 'date-time-range' || mode === 'time' || mode === 'time-range';

/** True for any mode whose value includes a date (day) component. */
export const isDateMode = (mode: DateTimePickerMode): boolean =>
  mode === 'date' || mode === 'date-time' || mode === 'date-range' || mode === 'date-time-range';

/** True for range modes. */
export const isRangeMode = (mode: DateTimePickerMode): boolean =>
  mode === 'date-range' || mode === 'date-time-range' || mode === 'time-range';
```

- [ ] **Step 2: Create the barrel**

`packages/ui/react-ui-calendar/src/components/DateTimePicker/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export * from './types';
```

- [ ] **Step 3: Wire the new subdir into the package barrel**

`packages/ui/react-ui-calendar/src/components/index.ts`:

```ts
//
// Copyright 2025 DXOS.org
//

export * from './Calendar';
export * from './DateTimePicker';
```

- [ ] **Step 4: Build**

Run:

```
moon run react-ui-calendar:build
```

Expected: green. Build validates the type predicates compile and `Range` is re-exportable.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/react-ui-calendar/src/components/DateTimePicker \
        packages/ui/react-ui-calendar/src/components/index.ts
git commit -m "feat(react-ui-calendar): scaffold DateTimePicker types and barrel"
```

---

## Task 3: Implement `util.ts` (value coercion + range normalization) with TDD

**Files:**

- Create: `packages/ui/react-ui-calendar/src/components/DateTimePicker/util.ts`
- Create: `packages/ui/react-ui-calendar/src/components/DateTimePicker/util.test.ts`

- [ ] **Step 1: Write the failing tests**

`packages/ui/react-ui-calendar/src/components/DateTimePicker/util.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { coerceValue, defaultValueFor, normalizeRange, withDate, withTime } from './util';

describe('coerceValue', () => {
  test('date mode zeroes time component', ({ expect }) => {
    const v = coerceValue('date', new Date('2026-05-24T14:30:00'));
    expect((v as Date).getHours()).toBe(0);
    expect((v as Date).getMinutes()).toBe(0);
    expect((v as Date).getSeconds()).toBe(0);
    expect((v as Date).getMilliseconds()).toBe(0);
  });

  test('date-time mode preserves time component', ({ expect }) => {
    const v = coerceValue('date-time', new Date('2026-05-24T14:30:00'));
    expect((v as Date).getHours()).toBe(14);
    expect((v as Date).getMinutes()).toBe(30);
  });

  test('date-range mode zeroes time on both endpoints and normalizes order', ({ expect }) => {
    const v = coerceValue('date-range', {
      from: new Date('2026-05-24T14:30:00'),
      to: new Date('2026-05-20T09:00:00'),
    });
    expect((v as { from: Date; to: Date }).from.getTime()).toBeLessThan((v as { from: Date; to: Date }).to.getTime());
    expect((v as { from: Date; to: Date }).from.getHours()).toBe(0);
    expect((v as { from: Date; to: Date }).to.getHours()).toBe(0);
  });
});

describe('normalizeRange', () => {
  test('swaps from/to when out of order', ({ expect }) => {
    const r = normalizeRange({ from: new Date('2026-05-24'), to: new Date('2026-05-20') });
    expect(r.from.getDate()).toBe(20);
    expect(r.to.getDate()).toBe(24);
  });

  test('leaves ordered range unchanged', ({ expect }) => {
    const r = normalizeRange({ from: new Date('2026-05-20'), to: new Date('2026-05-24') });
    expect(r.from.getDate()).toBe(20);
    expect(r.to.getDate()).toBe(24);
  });
});

describe('withDate / withTime', () => {
  test('withDate replaces year/month/day, preserves hours/minutes', ({ expect }) => {
    const result = withDate(new Date('2026-05-24T14:30:00'), new Date('2026-08-15T00:00:00'));
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(7);
    expect(result.getDate()).toBe(15);
    expect(result.getHours()).toBe(14);
    expect(result.getMinutes()).toBe(30);
  });

  test('withTime replaces hours/minutes, preserves date', ({ expect }) => {
    const result = withTime(new Date('2026-05-24T14:30:00'), 9, 0);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getDate()).toBe(24);
    expect(result.getHours()).toBe(9);
    expect(result.getMinutes()).toBe(0);
  });
});

describe('defaultValueFor', () => {
  test('date mode returns a midnight Date', ({ expect }) => {
    const v = defaultValueFor('date') as Date;
    expect(v.getHours()).toBe(0);
    expect(v.getMinutes()).toBe(0);
  });

  test('date-range mode returns a same-day from/to', ({ expect }) => {
    const v = defaultValueFor('date-range') as { from: Date; to: Date };
    expect(v.from.getFullYear()).toBe(v.to.getFullYear());
    expect(v.from.getMonth()).toBe(v.to.getMonth());
    expect(v.from.getDate()).toBe(v.to.getDate());
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```
moon run react-ui-calendar:test -- src/components/DateTimePicker/util.test.ts
```

Expected: FAIL with "module not found" or "coerceValue is not exported".

- [ ] **Step 3: Implement `util.ts`**

`packages/ui/react-ui-calendar/src/components/DateTimePicker/util.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { startOfDay } from 'date-fns';

import { type DateTimeRange, type DateTimePickerMode, type ValueFor, isRangeMode, isTimeMode } from './types';

/** Normalize an unordered range so `from <= to`. */
export const normalizeRange = (range: DateTimeRange): DateTimeRange =>
  range.from.getTime() <= range.to.getTime() ? range : { from: range.to, to: range.from };

/** Replace the date portion (year/month/day) of `target` with `source`'s date, preserving target's time. */
export const withDate = (target: Date, source: Date): Date => {
  const result = new Date(target);
  result.setFullYear(source.getFullYear(), source.getMonth(), source.getDate());
  return result;
};

/** Replace the time portion of `target` with `hours`/`minutes`, preserving target's date. */
export const withTime = (target: Date, hours: number, minutes: number): Date => {
  const result = new Date(target);
  result.setHours(hours, minutes, 0, 0);
  return result;
};

/** Coerce an inbound value to the canonical shape for `mode` (zero time for date-only, normalize ranges). */
export const coerceValue = <M extends DateTimePickerMode>(mode: M, value: ValueFor<M>): ValueFor<M> => {
  if (isRangeMode(mode)) {
    const range = value as DateTimeRange;
    const normalized = normalizeRange(range);
    if (!isTimeMode(mode)) {
      return { from: startOfDay(normalized.from), to: startOfDay(normalized.to) } as ValueFor<M>;
    }
    return normalized as ValueFor<M>;
  }
  const date = value as Date;
  if (!isTimeMode(mode)) {
    return startOfDay(date) as ValueFor<M>;
  }
  return date as ValueFor<M>;
};

/** Sensible empty default for `mode` (used by uncontrolled Root when neither `value` nor `defaultValue` is given). */
export const defaultValueFor = <M extends DateTimePickerMode>(mode: M): ValueFor<M> => {
  const now = new Date();
  if (isRangeMode(mode)) {
    const start = isTimeMode(mode) ? now : startOfDay(now);
    return { from: start, to: start } as ValueFor<M>;
  }
  return (isTimeMode(mode) ? now : startOfDay(now)) as ValueFor<M>;
};
```

- [ ] **Step 4: Re-run tests, expect pass**

Run:

```
moon run react-ui-calendar:test -- src/components/DateTimePicker/util.test.ts
```

Expected: PASS for all 9 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/react-ui-calendar/src/components/DateTimePicker/util.ts \
        packages/ui/react-ui-calendar/src/components/DateTimePicker/util.test.ts
git commit -m "feat(react-ui-calendar): add DateTimePicker value coercion utilities"
```

---

## Task 4: Implement `segments.ts` (locale-aware segment definitions + parse/format) with TDD

**Files:**

- Create: `packages/ui/react-ui-calendar/src/components/DateTimePicker/segments.ts`
- Create: `packages/ui/react-ui-calendar/src/components/DateTimePicker/segments.test.ts`

- [ ] **Step 1: Write the failing tests**

`packages/ui/react-ui-calendar/src/components/DateTimePicker/segments.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  type SegmentKind,
  formatSegments,
  incrementSegment,
  parseSegments,
  resolveDateSegmentOrder,
  resolveHourCycle,
  resolveTimeSegmentOrder,
} from './segments';

describe('resolveDateSegmentOrder', () => {
  test('en-US returns MM dd yyyy', ({ expect }) => {
    expect(resolveDateSegmentOrder('en-US')).toEqual(['MM', 'dd', 'yyyy']);
  });

  test('de-DE returns dd MM yyyy', ({ expect }) => {
    expect(resolveDateSegmentOrder('de-DE')).toEqual(['dd', 'MM', 'yyyy']);
  });

  test('ja-JP returns yyyy MM dd', ({ expect }) => {
    expect(resolveDateSegmentOrder('ja-JP')).toEqual(['yyyy', 'MM', 'dd']);
  });
});

describe('resolveHourCycle', () => {
  test('en-US defaults to h12', ({ expect }) => {
    expect(resolveHourCycle('en-US')).toBe('h12');
  });

  test('de-DE defaults to h23', ({ expect }) => {
    expect(resolveHourCycle('de-DE')).toBe('h23');
  });
});

describe('resolveTimeSegmentOrder', () => {
  test('h12 returns hh mm a', ({ expect }) => {
    expect(resolveTimeSegmentOrder('h12')).toEqual(['hh', 'mm', 'a']);
  });

  test('h23 returns HH mm', ({ expect }) => {
    expect(resolveTimeSegmentOrder('h23')).toEqual(['HH', 'mm']);
  });
});

describe('formatSegments / parseSegments', () => {
  test('format then parse round-trips a Date', ({ expect }) => {
    const date = new Date(2026, 4, 24, 14, 30); // May 24 2026, 14:30
    const segments = formatSegments(date, { dateOrder: ['MM', 'dd', 'yyyy'], timeOrder: ['HH', 'mm'] });
    const parsed = parseSegments(segments);
    expect(parsed?.getTime()).toBe(date.getTime());
  });

  test('parseSegments returns undefined when any required segment is empty', ({ expect }) => {
    const segments = { yyyy: '2026', MM: '05', dd: '', HH: '14', mm: '30' };
    expect(parseSegments(segments)).toBeUndefined();
  });

  test('parseSegments handles 12h with PM', ({ expect }) => {
    const segments = { yyyy: '2026', MM: '05', dd: '24', hh: '2', mm: '30', a: 'PM' };
    const parsed = parseSegments(segments);
    expect(parsed?.getHours()).toBe(14);
    expect(parsed?.getMinutes()).toBe(30);
  });

  test('parseSegments handles 12am as midnight', ({ expect }) => {
    const segments = { yyyy: '2026', MM: '05', dd: '24', hh: '12', mm: '00', a: 'AM' };
    expect(parseSegments(segments)?.getHours()).toBe(0);
  });

  test('parseSegments handles 12pm as noon', ({ expect }) => {
    const segments = { yyyy: '2026', MM: '05', dd: '24', hh: '12', mm: '00', a: 'PM' };
    expect(parseSegments(segments)?.getHours()).toBe(12);
  });
});

describe('incrementSegment', () => {
  test('yyyy +1 increments year', ({ expect }) => {
    expect(incrementSegment('yyyy', '2026', 1)).toBe('2027');
  });

  test('MM rolls 12 -> 01 on +1 (clamp-wrap)', ({ expect }) => {
    expect(incrementSegment('MM', '12', 1)).toBe('01');
  });

  test('MM rolls 01 -> 12 on -1', ({ expect }) => {
    expect(incrementSegment('MM', '01', -1)).toBe('12');
  });

  test('dd rolls 31 -> 01 on +1', ({ expect }) => {
    expect(incrementSegment('dd', '31', 1)).toBe('01');
  });

  test('HH rolls 23 -> 00 on +1', ({ expect }) => {
    expect(incrementSegment('HH', '23', 1)).toBe('00');
  });

  test('mm rolls 59 -> 00 on +1', ({ expect }) => {
    expect(incrementSegment('mm', '59', 1)).toBe('00');
  });

  test('a toggles between AM and PM', ({ expect }) => {
    expect(incrementSegment('a', 'AM', 1)).toBe('PM');
    expect(incrementSegment('a', 'PM', 1)).toBe('AM');
    expect(incrementSegment('a', 'AM', -1)).toBe('PM');
  });

  test('hh rolls 12 -> 1 on +1', ({ expect }) => {
    expect(incrementSegment('hh', '12', 1)).toBe('1');
  });
});
```

These tests intentionally cover both the public formatter/parser and the per-segment increment logic.

`SegmentKind` is the union `'yyyy' | 'MM' | 'dd' | 'HH' | 'hh' | 'mm' | 'a'`. `SegmentValues` (used by parse/format) is `Partial<Record<SegmentKind, string>>`.

- [ ] **Step 2: Run tests to verify they fail**

Run:

```
moon run react-ui-calendar:test -- src/components/DateTimePicker/segments.test.ts
```

Expected: FAIL with "module not found".

- [ ] **Step 3: Implement `segments.ts`**

`packages/ui/react-ui-calendar/src/components/DateTimePicker/segments.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { type HourCycle } from './types';

export type SegmentKind = 'yyyy' | 'MM' | 'dd' | 'HH' | 'hh' | 'mm' | 'a';

export type SegmentValues = Partial<Record<SegmentKind, string>>;

export type DateSegmentOrder = readonly ('yyyy' | 'MM' | 'dd')[];
export type TimeSegmentOrder = readonly ('HH' | 'hh' | 'mm' | 'a')[];

const DEFAULT_LOCALE = (): string => (typeof navigator !== 'undefined' ? navigator.language : 'en-US');

/**
 * Use `Intl.DateTimeFormat.formatToParts` to determine the locale's preferred
 * date segment order. Falls back to ISO order on environments without `Intl`
 * (vanishingly rare; tests run on node which has it).
 */
export const resolveDateSegmentOrder = (locale: string = DEFAULT_LOCALE()): DateSegmentOrder => {
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(2026, 4, 24));
    const order: ('yyyy' | 'MM' | 'dd')[] = [];
    for (const part of parts) {
      if (part.type === 'year') order.push('yyyy');
      else if (part.type === 'month') order.push('MM');
      else if (part.type === 'day') order.push('dd');
    }
    return order.length === 3 ? order : ['yyyy', 'MM', 'dd'];
  } catch {
    return ['yyyy', 'MM', 'dd'];
  }
};

export const resolveHourCycle = (locale: string = DEFAULT_LOCALE()): HourCycle => {
  try {
    const resolved = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions();
    const cycle = resolved.hourCycle;
    if (cycle === 'h11' || cycle === 'h12') return 'h12';
    return 'h23';
  } catch {
    return 'h23';
  }
};

export const resolveTimeSegmentOrder = (cycle: HourCycle): TimeSegmentOrder =>
  cycle === 'h12' ? (['hh', 'mm', 'a'] as const) : (['HH', 'mm'] as const);

const pad = (value: number, width: number): string => String(value).padStart(width, '0');

/** Format a `Date` to a `SegmentValues` map using the provided segment orders. */
export const formatSegments = (
  date: Date,
  options: { dateOrder?: DateSegmentOrder; timeOrder?: TimeSegmentOrder } = {},
): SegmentValues => {
  const segments: SegmentValues = {};
  if (options.dateOrder) {
    segments.yyyy = pad(date.getFullYear(), 4);
    segments.MM = pad(date.getMonth() + 1, 2);
    segments.dd = pad(date.getDate(), 2);
  }
  if (options.timeOrder) {
    if (options.timeOrder.includes('HH')) {
      segments.HH = pad(date.getHours(), 2);
    }
    if (options.timeOrder.includes('hh')) {
      const h = date.getHours() % 12;
      segments.hh = String(h === 0 ? 12 : h);
      segments.a = date.getHours() >= 12 ? 'PM' : 'AM';
    }
    segments.mm = pad(date.getMinutes(), 2);
  }
  return segments;
};

/**
 * Parse a `SegmentValues` map into a `Date`. Returns `undefined` if any
 * required segment is empty or invalid.
 *
 * Detects 12h vs 24h based on the presence of `hh`/`a` (12h) or `HH` (24h).
 * If neither time segment is present, time defaults to 00:00.
 */
export const parseSegments = (segments: SegmentValues): Date | undefined => {
  const yyyy = Number(segments.yyyy);
  const MM = Number(segments.MM);
  const dd = Number(segments.dd);
  if (!Number.isFinite(yyyy) || !Number.isFinite(MM) || !Number.isFinite(dd)) {
    return undefined;
  }
  if (segments.yyyy === '' || segments.MM === '' || segments.dd === '') {
    return undefined;
  }

  let hours = 0;
  let minutes = 0;
  const hasH23 = segments.HH !== undefined && segments.HH !== '';
  const has12 = segments.hh !== undefined && segments.hh !== '';
  if (hasH23) {
    const h = Number(segments.HH);
    if (!Number.isFinite(h)) return undefined;
    hours = h;
  } else if (has12) {
    const h = Number(segments.hh);
    if (!Number.isFinite(h)) return undefined;
    const ampm = segments.a ?? 'AM';
    if (ampm === 'PM') {
      hours = h === 12 ? 12 : h + 12;
    } else {
      hours = h === 12 ? 0 : h;
    }
  }
  if (segments.mm !== undefined && segments.mm !== '') {
    const m = Number(segments.mm);
    if (!Number.isFinite(m)) return undefined;
    minutes = m;
  }

  return new Date(yyyy, MM - 1, dd, hours, minutes, 0, 0);
};

/** Clamp-wrap a numeric segment within [min, max] (inclusive). */
const wrap = (value: number, delta: number, min: number, max: number): number => {
  const span = max - min + 1;
  let next = value + delta;
  while (next < min) next += span;
  while (next > max) next -= span;
  return next;
};

/**
 * Increment or decrement a single segment by `delta` (typically ±1).
 * Numeric segments wrap; AM/PM toggles.
 */
export const incrementSegment = (kind: SegmentKind, value: string, delta: number): string => {
  if (kind === 'a') {
    return value === 'AM' ? 'PM' : 'AM';
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return value;
  }
  switch (kind) {
    case 'yyyy':
      return String(n + delta);
    case 'MM':
      return String(wrap(n, delta, 1, 12)).padStart(2, '0');
    case 'dd':
      return String(wrap(n, delta, 1, 31)).padStart(2, '0');
    case 'HH':
      return String(wrap(n, delta, 0, 23)).padStart(2, '0');
    case 'hh':
      return String(wrap(n, delta, 1, 12));
    case 'mm':
      return String(wrap(n, delta, 0, 59)).padStart(2, '0');
  }
};
```

- [ ] **Step 4: Run tests, expect pass**

Run:

```
moon run react-ui-calendar:test -- src/components/DateTimePicker/segments.test.ts
```

Expected: PASS for all 17 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/react-ui-calendar/src/components/DateTimePicker/segments.ts \
        packages/ui/react-ui-calendar/src/components/DateTimePicker/segments.test.ts
git commit -m "feat(react-ui-calendar): add locale-aware segment parser/formatter"
```

---

## Task 5: Implement `SegmentedInput` component (presentational)

**Files:**

- Create: `packages/ui/react-ui-calendar/src/components/DateTimePicker/SegmentedInput.tsx`

This task is presentational; the heavy logic is already covered by `segments.ts` tests. We rely on Storybook (Task 9) for visual coverage and on the consumer tests in Task 8 for integration coverage.

- [ ] **Step 1: Create `SegmentedInput.tsx`**

```tsx
//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent as ReactKeyboardEvent, forwardRef, useCallback, useRef } from 'react';

import { mx } from '@dxos/ui-theme';

import {
  type DateSegmentOrder,
  type SegmentKind,
  type SegmentValues,
  type TimeSegmentOrder,
  incrementSegment,
} from './segments';

const SEGMENT_PLACEHOLDER: Record<SegmentKind, string> = {
  yyyy: 'yyyy',
  MM: 'mm',
  dd: 'dd',
  HH: 'hh',
  hh: 'hh',
  mm: 'mm',
  a: 'AM',
};

const SEGMENT_WIDTH_CH: Record<SegmentKind, number> = {
  yyyy: 4,
  MM: 2,
  dd: 2,
  HH: 2,
  hh: 2,
  mm: 2,
  a: 2,
};

const SEGMENT_NUMERIC_MAX_LEN: Record<SegmentKind, number> = {
  yyyy: 4,
  MM: 2,
  dd: 2,
  HH: 2,
  hh: 2,
  mm: 2,
  a: 2,
};

export type SegmentedInputProps = {
  dateOrder?: DateSegmentOrder;
  timeOrder?: TimeSegmentOrder;
  values: SegmentValues;
  onChange: (values: SegmentValues) => void;
  disabled?: boolean;
  classNames?: string;
};

const isNumericSegment = (kind: SegmentKind): boolean => kind !== 'a';

/**
 * A row of editable date/time segments. Driven entirely by the `values` prop;
 * keyboard handlers transform values and call `onChange`. Focus is internal.
 */
export const SegmentedInput = forwardRef<HTMLDivElement, SegmentedInputProps>(
  ({ dateOrder, timeOrder, values, onChange, disabled = false, classNames }, forwardedRef) => {
    const segments: SegmentKind[] = [...((dateOrder ?? []) as SegmentKind[]), ...((timeOrder ?? []) as SegmentKind[])];
    const segmentRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const focusSegment = useCallback((kind: SegmentKind) => {
      segmentRefs.current[kind]?.focus();
      segmentRefs.current[kind]?.select();
    }, []);

    const focusOffset = useCallback(
      (current: SegmentKind, delta: number) => {
        const i = segments.indexOf(current);
        const next = segments[i + delta];
        if (next) {
          focusSegment(next);
        }
      },
      [segments, focusSegment],
    );

    const handleKeyDown = useCallback(
      (kind: SegmentKind) => (ev: ReactKeyboardEvent<HTMLInputElement>) => {
        if (disabled) return;
        const current = values[kind] ?? '';

        if (ev.key === 'ArrowUp') {
          ev.preventDefault();
          const seed = current === '' ? defaultSeed(kind) : current;
          onChange({ ...values, [kind]: incrementSegment(kind, seed, 1) });
          return;
        }
        if (ev.key === 'ArrowDown') {
          ev.preventDefault();
          const seed = current === '' ? defaultSeed(kind) : current;
          onChange({ ...values, [kind]: incrementSegment(kind, seed, -1) });
          return;
        }
        if (ev.key === 'ArrowRight' || (ev.key === 'Tab' && !ev.shiftKey)) {
          if (ev.key === 'ArrowRight') {
            ev.preventDefault();
            focusOffset(kind, 1);
          }
          return;
        }
        if (ev.key === 'ArrowLeft' || (ev.key === 'Tab' && ev.shiftKey)) {
          if (ev.key === 'ArrowLeft') {
            ev.preventDefault();
            focusOffset(kind, -1);
          }
          return;
        }
        if (ev.key === 'Backspace') {
          ev.preventDefault();
          onChange({ ...values, [kind]: '' });
          return;
        }

        // AM/PM segment: typing 'a' or 'p' jumps.
        if (kind === 'a') {
          if (ev.key.toLowerCase() === 'a') {
            ev.preventDefault();
            onChange({ ...values, a: 'AM' });
            focusOffset(kind, 1);
          } else if (ev.key.toLowerCase() === 'p') {
            ev.preventDefault();
            onChange({ ...values, a: 'PM' });
            focusOffset(kind, 1);
          }
          return;
        }

        // Numeric segments: accumulate digits up to max length; auto-advance when filled.
        if (/^[0-9]$/.test(ev.key)) {
          ev.preventDefault();
          const maxLen = SEGMENT_NUMERIC_MAX_LEN[kind];
          const next = (current + ev.key).slice(-maxLen);
          onChange({ ...values, [kind]: next });
          if (next.length >= maxLen) {
            focusOffset(kind, 1);
          }
        }
      },
      [disabled, values, onChange, focusOffset],
    );

    return (
      <div
        ref={forwardedRef}
        role='group'
        className={mx(
          'inline-flex items-center gap-0.5 px-2 py-1 rounded border border-input-stroke bg-input-surface',
          disabled && 'opacity-50',
          classNames,
        )}
      >
        {segments.map((kind, i) => {
          const value = values[kind] ?? '';
          const placeholder = SEGMENT_PLACEHOLDER[kind];
          return (
            <React.Fragment key={kind}>
              {i > 0 && <span className='text-description'>{separatorBetween(segments[i - 1], kind)}</span>}
              <input
                ref={(node) => {
                  segmentRefs.current[kind] = node;
                }}
                value={value}
                placeholder={placeholder}
                disabled={disabled}
                readOnly
                onKeyDown={handleKeyDown(kind)}
                onFocus={(ev) => ev.currentTarget.select()}
                inputMode={isNumericSegment(kind) ? 'numeric' : 'text'}
                className='text-center bg-transparent outline-none caret-transparent'
                style={{ width: `${SEGMENT_WIDTH_CH[kind]}ch` }}
                data-segment={kind}
              />
            </React.Fragment>
          );
        })}
      </div>
    );
  },
);

SegmentedInput.displayName = 'SegmentedInput';

/** Initial seed when incrementing an empty segment (so ArrowUp on empty yyyy yields current year, etc.). */
const defaultSeed = (kind: SegmentKind): string => {
  const now = new Date();
  switch (kind) {
    case 'yyyy':
      return String(now.getFullYear());
    case 'MM':
      return String(now.getMonth() + 1).padStart(2, '0');
    case 'dd':
      return String(now.getDate()).padStart(2, '0');
    case 'HH':
      return '00';
    case 'hh':
      return '12';
    case 'mm':
      return '00';
    case 'a':
      return 'AM';
  }
};

/** Separator character drawn between two adjacent segments. */
const separatorBetween = (prev: SegmentKind, next: SegmentKind): string => {
  if (next === 'mm' && (prev === 'HH' || prev === 'hh')) return ':';
  if (next === 'a') return ' ';
  if (prev === 'mm' || prev === 'HH' || prev === 'hh') return ' ';
  return '/';
};
```

- [ ] **Step 2: Build**

Run:

```
moon run react-ui-calendar:build
```

Expected: green.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/react-ui-calendar/src/components/DateTimePicker/SegmentedInput.tsx
git commit -m "feat(react-ui-calendar): add SegmentedInput primitive for DateTimePicker"
```

---

## Task 6: Implement `useDateTimePicker` state hook

**Files:**

- Create: `packages/ui/react-ui-calendar/src/components/DateTimePicker/useDateTimePicker.ts`

- [ ] **Step 1: Create the hook**

```ts
//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo, useState } from 'react';

import {
  type DateTimePickerMode,
  type DateTimePickerRootProps,
  type DateTimeRange,
  type ValueFor,
  isRangeMode,
} from './types';
import { coerceValue, defaultValueFor } from './util';

export type RangeEndpoint = 'from' | 'to';

export type DateTimePickerState<M extends DateTimePickerMode> = {
  mode: M;
  /** Currently committed value (what callers observe). */
  committed: ValueFor<M>;
  /** In-popover draft value (may differ from `committed` until commit/cancel). */
  draft: ValueFor<M>;
  setDraft: (next: ValueFor<M>) => void;
  /** For range modes: which endpoint the popover is currently editing. */
  endpoint: RangeEndpoint;
  setEndpoint: (endpoint: RangeEndpoint) => void;
  /** Commit the draft to `committed` and fire `onValueChange`. */
  commit: () => void;
  /** Drop the draft (reset it to `committed`). */
  cancelDraft: () => void;
  /** Open state of the popover. */
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Write a committed value directly (used by trigger segment edits). */
  setCommitted: (next: ValueFor<M>) => void;
};

/** Internal state hook for `DateTimePicker.Root`. Implements the controlled+uncontrolled pattern. */
export const useDateTimePicker = <M extends DateTimePickerMode>(
  props: DateTimePickerRootProps<M>,
): DateTimePickerState<M> => {
  const { mode, value, defaultValue, onValueChange, open: openProp, defaultOpen, onOpenChange } = props;

  // Committed value: controlled if `value` provided, else internal.
  const [internalValue, setInternalValue] = useState<ValueFor<M>>(() =>
    coerceValue(mode, defaultValue ?? defaultValueFor(mode)),
  );
  const committed = value !== undefined ? coerceValue(mode, value) : internalValue;

  const setCommitted = useCallback(
    (next: ValueFor<M>) => {
      const coerced = coerceValue(mode, next);
      if (value === undefined) {
        setInternalValue(coerced);
      }
      onValueChange?.(coerced);
    },
    [mode, value, onValueChange],
  );

  // Draft value: always internal; seeded from committed when popover opens.
  const [draft, setDraftInternal] = useState<ValueFor<M>>(committed);
  const [endpoint, setEndpoint] = useState<RangeEndpoint>('from');

  const setDraft = useCallback((next: ValueFor<M>) => {
    setDraftInternal(next);
  }, []);

  const commit = useCallback(() => {
    setCommitted(draft);
  }, [draft, setCommitted]);

  const cancelDraft = useCallback(() => {
    setDraftInternal(committed);
  }, [committed]);

  // Open state: controlled if `open` provided, else internal.
  const [internalOpen, setInternalOpen] = useState(defaultOpen ?? false);
  const open = openProp !== undefined ? openProp : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (next) {
        // Re-seed draft from committed each time we open.
        setDraftInternal(committed);
        if (isRangeMode(mode)) {
          setEndpoint('from');
        }
      }
      if (openProp === undefined) {
        setInternalOpen(next);
      }
      onOpenChange?.(next);
    },
    [committed, mode, openProp, onOpenChange],
  );

  return useMemo<DateTimePickerState<M>>(
    () => ({
      mode,
      committed,
      draft,
      setDraft,
      endpoint,
      setEndpoint,
      commit,
      cancelDraft,
      open,
      setOpen,
      setCommitted,
    }),
    [mode, committed, draft, setDraft, endpoint, commit, cancelDraft, open, setOpen, setCommitted],
  );
};
```

Note: `DateTimeRange` is imported only for its type — but `isRangeMode` is the runtime guard used here.

- [ ] **Step 2: Build**

Run:

```
moon run react-ui-calendar:build
```

Expected: green.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/react-ui-calendar/src/components/DateTimePicker/useDateTimePicker.ts
git commit -m "feat(react-ui-calendar): add useDateTimePicker state hook"
```

---

## Task 7: Implement `DateTimePicker.tsx` (namespace, Root, Input, Content, Time, Commit)

**Files:**

- Create: `packages/ui/react-ui-calendar/src/components/DateTimePicker/DateTimePicker.tsx`
- Modify: `packages/ui/react-ui-calendar/src/components/DateTimePicker/index.ts`
- Modify: `packages/ui/react-ui-calendar/src/translations.ts`

- [ ] **Step 1: Add translation keys**

`packages/ui/react-ui-calendar/src/translations.ts`:

```ts
//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = '@dxos/react-ui-calendar';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'today.button': 'Today',
        'prev.button': 'Previous month',
        'next.button': 'Next month',
        'open.button': 'Open calendar',
        'commit.button': 'OK',
        'cancel.button': 'Cancel',
        'range.from': 'From',
        'range.to': 'To',
      },
    },
  },
] as const satisfies Resource[];
```

- [ ] **Step 2: Create `DateTimePicker.tsx`**

```tsx
//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { type Day, startOfDay } from 'date-fns';
import React, { type PropsWithChildren, type Ref, forwardRef, useCallback, useEffect, useMemo, useRef } from 'react';

import { Button, IconButton, Popover, useTranslation } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import { Calendar, type CalendarController, type Range as DateRange } from '../Calendar/Calendar';
import { SegmentedInput } from './SegmentedInput';
import {
  type DateSegmentOrder,
  type SegmentValues,
  type TimeSegmentOrder,
  formatSegments,
  parseSegments,
  resolveDateSegmentOrder,
  resolveHourCycle,
  resolveTimeSegmentOrder,
} from './segments';
import {
  type DateTimePickerMode,
  type DateTimePickerRootProps,
  type ValueFor,
  isDateMode,
  isRangeMode,
  isTimeMode,
} from './types';
import { type DateTimePickerState, type RangeEndpoint, useDateTimePicker } from './useDateTimePicker';
import { withDate, withTime } from './util';

//
// Context
//

type DateTimePickerContextValue = {
  state: DateTimePickerState<DateTimePickerMode>;
  dateOrder: DateSegmentOrder | undefined;
  timeOrder: TimeSegmentOrder | undefined;
  weekStartsOn: Day;
  step: number;
  disabled: boolean;
};

const [DateTimePickerContextProvider, useDateTimePickerContext] =
  createContext<DateTimePickerContextValue>('DateTimePicker');

//
// Root
//

const Root = <M extends DateTimePickerMode>({ children, ...props }: PropsWithChildren<DateTimePickerRootProps<M>>) => {
  const state = useDateTimePicker<M>(props);
  const locale = props.locale ?? (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  const hourCycle = props.hourCycle ?? resolveHourCycle(locale);
  const dateOrder = isDateMode(state.mode) ? resolveDateSegmentOrder(locale) : undefined;
  const timeOrder = isTimeMode(state.mode) ? resolveTimeSegmentOrder(hourCycle) : undefined;

  return (
    <Popover.Root open={state.open} onOpenChange={state.setOpen}>
      <DateTimePickerContextProvider
        state={state as DateTimePickerState<DateTimePickerMode>}
        dateOrder={dateOrder}
        timeOrder={timeOrder}
        weekStartsOn={props.weekStartsOn ?? 1}
        step={props.step ?? 15}
        disabled={props.disabled ?? false}
      >
        {children}
      </DateTimePickerContextProvider>
    </Popover.Root>
  );
};

//
// Input (trigger)
//

const INPUT_NAME = 'DateTimePicker.Input';

type InputProps = {};

const Input = composable<HTMLDivElement, InputProps>(({ classNames, ...props }, forwardedRef) => {
  const { state, dateOrder, timeOrder, disabled } = useDateTimePickerContext(INPUT_NAME);
  const { t } = useTranslation(translationKey);

  // For range modes render two rows of segmented inputs (from / to).
  if (isRangeMode(state.mode)) {
    return (
      <div
        {...composableProps(props, {
          role: 'group',
          classNames: ['inline-flex items-center gap-2', classNames],
        })}
        ref={forwardedRef}
      >
        <EndpointSegments
          endpoint='from'
          label={t('range.from')}
          dateOrder={dateOrder}
          timeOrder={timeOrder}
          disabled={disabled}
        />
        <span className='text-description'>—</span>
        <EndpointSegments
          endpoint='to'
          label={t('range.to')}
          dateOrder={dateOrder}
          timeOrder={timeOrder}
          disabled={disabled}
        />
        <Popover.Trigger asChild>
          <IconButton
            variant='ghost'
            icon='ph--calendar--regular'
            iconOnly
            classNames='aspect-square'
            label={t('open.button')}
            disabled={disabled}
          />
        </Popover.Trigger>
      </div>
    );
  }

  return (
    <div
      {...composableProps(props, {
        role: 'group',
        classNames: ['inline-flex items-center gap-1', classNames],
      })}
      ref={forwardedRef}
    >
      <ScalarSegments dateOrder={dateOrder} timeOrder={timeOrder} disabled={disabled} />
      <Popover.Trigger asChild>
        <IconButton
          variant='ghost'
          icon='ph--calendar--regular'
          iconOnly
          classNames='aspect-square'
          label={t('open.button')}
          disabled={disabled}
        />
      </Popover.Trigger>
    </div>
  );
});

Input.displayName = INPUT_NAME;

//
// Internal: scalar segment row (binds to state.committed as a single Date)
//

type ScalarSegmentsProps = {
  dateOrder: DateSegmentOrder | undefined;
  timeOrder: TimeSegmentOrder | undefined;
  disabled: boolean;
};

const ScalarSegments = ({ dateOrder, timeOrder, disabled }: ScalarSegmentsProps) => {
  const { state } = useDateTimePickerContext(INPUT_NAME);
  const committed = state.committed as Date;
  const values = useMemo(() => formatSegments(committed, { dateOrder, timeOrder }), [committed, dateOrder, timeOrder]);

  const handleChange = useCallback(
    (next: SegmentValues) => {
      const parsed = parseSegments(next);
      if (parsed) {
        // Coercion (zero time for date-only modes) happens inside setCommitted.
        state.setCommitted(parsed as ValueFor<DateTimePickerMode>);
      }
      // If incomplete, we still want the segment values to render — but since
      // SegmentedInput is driven by `values`, partial states render only on
      // re-entry from formatSegments. For now partial typing is lost between
      // segments; full-completion is required to commit. (Acceptable for v1.)
    },
    [state],
  );

  return (
    <SegmentedInput
      dateOrder={dateOrder}
      timeOrder={timeOrder}
      values={values}
      onChange={handleChange}
      disabled={disabled}
    />
  );
};

//
// Internal: range endpoint segment row
//

type EndpointSegmentsProps = {
  endpoint: RangeEndpoint;
  label: string;
  dateOrder: DateSegmentOrder | undefined;
  timeOrder: TimeSegmentOrder | undefined;
  disabled: boolean;
};

const EndpointSegments = ({ endpoint, label, dateOrder, timeOrder, disabled }: EndpointSegmentsProps) => {
  const { state } = useDateTimePickerContext(INPUT_NAME);
  const range = state.committed as DateRange;
  const date = range[endpoint];
  const values = useMemo(() => formatSegments(date, { dateOrder, timeOrder }), [date, dateOrder, timeOrder]);

  const handleChange = useCallback(
    (next: SegmentValues) => {
      const parsed = parseSegments(next);
      if (parsed) {
        const updated = { ...range, [endpoint]: parsed };
        state.setCommitted(updated as ValueFor<DateTimePickerMode>);
      }
    },
    [endpoint, range, state],
  );

  return (
    <div className='inline-flex flex-col gap-0.5'>
      <span className='text-xs text-description'>{label}</span>
      <SegmentedInput
        dateOrder={dateOrder}
        timeOrder={timeOrder}
        values={values}
        onChange={handleChange}
        disabled={disabled}
      />
    </div>
  );
};

//
// Content (popover content)
//

const CONTENT_NAME = 'DateTimePicker.Content';

const Content = composable<HTMLDivElement, {}>(({ classNames, ...props }, forwardedRef) => {
  const { state, weekStartsOn } = useDateTimePickerContext(CONTENT_NAME);
  const controllerRef = useRef<CalendarController>(null);

  // When opening, scroll the grid to the current draft date.
  useEffect(() => {
    if (!state.open) return;
    const draftDate = pickDate(state.draft, state.endpoint);
    if (draftDate) {
      controllerRef.current?.scrollTo(draftDate);
    }
  }, [state.open, state.draft, state.endpoint]);

  const handleSelect = useCallback(
    ({ date }: { date: Date }) => {
      if (isRangeMode(state.mode)) {
        const current = state.draft as DateRange;
        const updated = { ...current, [state.endpoint]: withDate(current[state.endpoint], date) };
        state.setDraft(updated as ValueFor<DateTimePickerMode>);
      } else {
        const current = state.draft as Date;
        state.setDraft(withDate(current, date) as ValueFor<DateTimePickerMode>);
      }
    },
    [state],
  );

  const handleSelectRange = useCallback(
    ({ range }: { range: DateRange }) => {
      if (!isRangeMode(state.mode)) return;
      // Preserve any time-of-day from the existing draft endpoints.
      const current = state.draft as DateRange;
      const updated = {
        from: withDate(current.from, range.from),
        to: withDate(current.to, range.to),
      };
      state.setDraft(updated as ValueFor<DateTimePickerMode>);
    },
    [state],
  );

  return (
    <Popover.Portal>
      <Popover.Content
        side='bottom'
        align='start'
        sideOffset={4}
        onEscapeKeyDown={() => state.cancelDraft()}
        onPointerDownOutside={() => state.cancelDraft()}
        {...composableProps(props, {
          classNames: ['p-2 rounded bg-modal-surface shadow-md flex flex-col gap-2', classNames],
        })}
        ref={forwardedRef}
      >
        <Calendar.Root ref={controllerRef} weekStartsOn={weekStartsOn}>
          <Calendar.Toolbar nav />
          <Calendar.Grid rows={6} onSelect={handleSelect} onSelectRange={handleSelectRange} />
        </Calendar.Root>
        {isTimeMode(state.mode) && <Time />}
        <Commit />
      </Popover.Content>
    </Popover.Portal>
  );
});

Content.displayName = CONTENT_NAME;

//
// Time
//

const TIME_NAME = 'DateTimePicker.Time';

const Time = () => {
  const { state, timeOrder, step } = useDateTimePickerContext(TIME_NAME);
  if (!timeOrder) return null;

  if (isRangeMode(state.mode)) {
    const range = state.draft as DateRange;
    return (
      <div className='flex items-center gap-3 justify-center text-sm text-description'>
        <TimeField endpoint='from' date={range.from} timeOrder={timeOrder} step={step} />
        <span>—</span>
        <TimeField endpoint='to' date={range.to} timeOrder={timeOrder} step={step} />
      </div>
    );
  }

  return (
    <div className='flex items-center justify-center text-sm text-description'>
      <TimeField endpoint={null} date={state.draft as Date} timeOrder={timeOrder} step={step} />
    </div>
  );
};

type TimeFieldProps = {
  endpoint: RangeEndpoint | null;
  date: Date;
  timeOrder: TimeSegmentOrder;
  step: number;
};

const TimeField = ({ endpoint, date, timeOrder, step }: TimeFieldProps) => {
  const { state } = useDateTimePickerContext(TIME_NAME);
  const values = useMemo(() => formatSegments(date, { timeOrder }), [date, timeOrder]);

  const handleChange = useCallback(
    (next: SegmentValues) => {
      // Build a synthetic full date by merging next time onto the existing draft endpoint.
      const merged = { ...formatSegments(date, { dateOrder: ['yyyy', 'MM', 'dd'] }), ...next };
      const parsed = parseSegments(merged);
      if (!parsed) return;
      // Snap minutes to step.
      const snappedMinutes = Math.round(parsed.getMinutes() / step) * step;
      const snapped = withTime(parsed, parsed.getHours(), snappedMinutes % 60);

      if (endpoint == null) {
        state.setDraft(snapped as ValueFor<DateTimePickerMode>);
      } else {
        const current = state.draft as DateRange;
        const updated = { ...current, [endpoint]: snapped };
        state.setDraft(updated as ValueFor<DateTimePickerMode>);
      }
    },
    [date, endpoint, state, step, timeOrder],
  );

  return <SegmentedInput timeOrder={timeOrder} values={values} onChange={handleChange} />;
};

//
// Commit
//

const COMMIT_NAME = 'DateTimePicker.Commit';

const Commit = () => {
  const { state } = useDateTimePickerContext(COMMIT_NAME);
  const { t } = useTranslation(translationKey);
  const handleClick = useCallback(() => {
    state.commit();
    state.setOpen(false);
  }, [state]);
  return (
    <div className='flex justify-end'>
      <Button variant='primary' onClick={handleClick}>
        {t('commit.button')}
      </Button>
    </div>
  );
};

//
// Helpers
//

const pickDate = (value: ValueFor<DateTimePickerMode>, endpoint: RangeEndpoint): Date | undefined => {
  if (value instanceof Date) return value;
  const range = value as DateRange;
  return range?.[endpoint];
};

//
// Namespace
//

export const DateTimePicker = {
  Root,
  Input,
  Content,
  Time,
  Commit,
};

export type { DateTimePickerRootProps };
```

- [ ] **Step 3: Update barrel**

`packages/ui/react-ui-calendar/src/components/DateTimePicker/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export * from './types';
export * from './DateTimePicker';
```

- [ ] **Step 4: Build, lint**

Run:

```
moon run react-ui-calendar:lint -- --fix
moon run react-ui-calendar:build
```

Expected: green.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/react-ui-calendar/src/components/DateTimePicker/DateTimePicker.tsx \
        packages/ui/react-ui-calendar/src/components/DateTimePicker/index.ts \
        packages/ui/react-ui-calendar/src/translations.ts
git commit -m "feat(react-ui-calendar): add DateTimePicker namespace (Root/Input/Content/Time/Commit)"
```

---

## Task 8: Integration test — `useDateTimePicker` controlled/uncontrolled

**Files:**

- Create: `packages/ui/react-ui-calendar/src/components/DateTimePicker/useDateTimePicker.test.ts`

- [ ] **Step 1: Write the test**

```ts
//
// Copyright 2026 DXOS.org
//

import { act, renderHook } from '@testing-library/react';
import { describe, test, vi } from 'vitest';

import { useDateTimePicker } from './useDateTimePicker';

describe('useDateTimePicker', () => {
  test('uncontrolled: commit updates committed and fires onValueChange', ({ expect }) => {
    const onValueChange = vi.fn();
    const { result } = renderHook(() =>
      useDateTimePicker({
        mode: 'date',
        defaultValue: new Date(2026, 4, 24),
        onValueChange,
      }),
    );
    act(() => result.current.setOpen(true));
    act(() => result.current.setDraft(new Date(2026, 4, 25)));
    act(() => result.current.commit());
    expect(result.current.committed.getDate()).toBe(25);
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  test('cancelDraft resets draft to committed', ({ expect }) => {
    const { result } = renderHook(() =>
      useDateTimePicker({
        mode: 'date',
        defaultValue: new Date(2026, 4, 24),
      }),
    );
    act(() => result.current.setOpen(true));
    act(() => result.current.setDraft(new Date(2026, 4, 25)));
    act(() => result.current.cancelDraft());
    expect(result.current.draft.getDate()).toBe(24);
  });

  test('controlled: setCommitted does not mutate internal state when value prop provided', ({ expect }) => {
    const onValueChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ value }: { value: Date }) =>
        useDateTimePicker({
          mode: 'date',
          value,
          onValueChange,
        }),
      { initialProps: { value: new Date(2026, 4, 24) } },
    );
    act(() => result.current.setCommitted(new Date(2026, 4, 26)));
    // onValueChange was called but the controlled value hasn't changed (parent didn't rerender).
    expect(result.current.committed.getDate()).toBe(24);
    expect(onValueChange).toHaveBeenCalledTimes(1);

    // Parent rerenders with the new value.
    rerender({ value: new Date(2026, 4, 26) });
    expect(result.current.committed.getDate()).toBe(26);
  });

  test('opening seeds draft from committed', ({ expect }) => {
    const { result } = renderHook(() =>
      useDateTimePicker({
        mode: 'date',
        defaultValue: new Date(2026, 4, 24),
      }),
    );
    // First mutate the draft while closed.
    act(() => result.current.setDraft(new Date(2026, 4, 30)));
    expect(result.current.draft.getDate()).toBe(30);
    // Opening re-seeds draft from committed.
    act(() => result.current.setOpen(true));
    expect(result.current.draft.getDate()).toBe(24);
  });
});
```

`@testing-library/react` is already a devDependency in many packages; verify availability:

```
ls /Users/burdon/Code/dxos/dxos/.claude/worktrees/condescending-galileo-30f588/node_modules/@testing-library/react 2>/dev/null && echo OK
```

If it is not available in `react-ui-calendar`, add it before running the test:

```
pnpm add --filter @dxos/react-ui-calendar --save-catalog --save-dev @testing-library/react
```

- [ ] **Step 2: Run the test**

```
moon run react-ui-calendar:test -- src/components/DateTimePicker/useDateTimePicker.test.ts
```

Expected: PASS for all 4 tests.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/react-ui-calendar/src/components/DateTimePicker/useDateTimePicker.test.ts \
        packages/ui/react-ui-calendar/package.json \
        pnpm-lock.yaml 2>/dev/null
git commit -m "test(react-ui-calendar): cover useDateTimePicker controlled/uncontrolled behaviour"
```

(Only include `package.json` / `pnpm-lock.yaml` if `@testing-library/react` was added.)

---

## Task 9: Storybook stories for every mode

**Files:**

- Create: `packages/ui/react-ui-calendar/src/components/DateTimePicker/DateTimePicker.stories.tsx`

- [ ] **Step 1: Write the stories**

```tsx
//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { format } from 'date-fns';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { DateTimePicker } from './DateTimePicker';
import { type DateTimeRange } from './types';

const meta = {
  title: 'ui/react-ui-calendar/DateTimePicker',
  parameters: {
    translations,
  },
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const DateMode: Story = {
  render: () => {
    const [value, setValue] = useState<Date>(new Date(2026, 4, 24));
    return (
      <DateTimePicker.Root mode='date' value={value} onValueChange={setValue}>
        <DateTimePicker.Input />
        <DateTimePicker.Content />
        <div className='text-sm text-description text-center mt-2'>{format(value, 'PP')}</div>
      </DateTimePicker.Root>
    );
  },
};

export const DateTimeMode: Story = {
  render: () => {
    const [value, setValue] = useState<Date>(new Date(2026, 4, 24, 14, 30));
    return (
      <DateTimePicker.Root mode='date-time' value={value} onValueChange={setValue}>
        <DateTimePicker.Input />
        <DateTimePicker.Content />
        <div className='text-sm text-description text-center mt-2'>{format(value, 'PPp')}</div>
      </DateTimePicker.Root>
    );
  },
};

export const DateRangeMode: Story = {
  render: () => {
    const [value, setValue] = useState<DateTimeRange>({
      from: new Date(2026, 4, 24),
      to: new Date(2026, 4, 28),
    });
    return (
      <DateTimePicker.Root mode='date-range' value={value} onValueChange={setValue}>
        <DateTimePicker.Input />
        <DateTimePicker.Content />
        <div className='text-sm text-description text-center mt-2'>
          {format(value.from, 'PP')} → {format(value.to, 'PP')}
        </div>
      </DateTimePicker.Root>
    );
  },
};

export const DateTimeRangeMode: Story = {
  render: () => {
    const [value, setValue] = useState<DateTimeRange>({
      from: new Date(2026, 4, 24, 9, 0),
      to: new Date(2026, 4, 24, 17, 0),
    });
    return (
      <DateTimePicker.Root mode='date-time-range' value={value} onValueChange={setValue}>
        <DateTimePicker.Input />
        <DateTimePicker.Content />
        <div className='text-sm text-description text-center mt-2'>
          {format(value.from, 'PPp')} → {format(value.to, 'PPp')}
        </div>
      </DateTimePicker.Root>
    );
  },
};

export const TimeMode: Story = {
  render: () => {
    const [value, setValue] = useState<Date>(new Date(2026, 4, 24, 14, 30));
    return (
      <DateTimePicker.Root mode='time' value={value} onValueChange={setValue}>
        <DateTimePicker.Input />
        <DateTimePicker.Content />
        <div className='text-sm text-description text-center mt-2'>{format(value, 'p')}</div>
      </DateTimePicker.Root>
    );
  },
};

export const TimeRangeMode: Story = {
  render: () => {
    const [value, setValue] = useState<DateTimeRange>({
      from: new Date(2026, 4, 24, 9, 0),
      to: new Date(2026, 4, 24, 17, 0),
    });
    return (
      <DateTimePicker.Root mode='time-range' value={value} onValueChange={setValue}>
        <DateTimePicker.Input />
        <DateTimePicker.Content />
        <div className='text-sm text-description text-center mt-2'>
          {format(value.from, 'p')} → {format(value.to, 'p')}
        </div>
      </DateTimePicker.Root>
    );
  },
};

export const Uncontrolled: Story = {
  render: () => (
    <DateTimePicker.Root mode='date-time' defaultValue={new Date(2026, 4, 24, 14, 30)}>
      <DateTimePicker.Input />
      <DateTimePicker.Content />
    </DateTimePicker.Root>
  ),
};

export const LocaleDeDE: Story = {
  render: () => {
    const [value, setValue] = useState<Date>(new Date(2026, 4, 24, 14, 30));
    return (
      <DateTimePicker.Root mode='date-time' locale='de-DE' value={value} onValueChange={setValue}>
        <DateTimePicker.Input />
        <DateTimePicker.Content />
      </DateTimePicker.Root>
    );
  },
};
```

- [ ] **Step 2: Lint + build (storybook is built via the package build)**

Run:

```
moon run react-ui-calendar:lint -- --fix
moon run react-ui-calendar:build
```

Expected: green.

- [ ] **Step 3: Visual sanity check**

Run:

```
moon run storybook-react:serve
```

Navigate to `ui/react-ui-calendar/DateTimePicker`. Verify each story:

- Trigger renders segmented input + calendar icon.
- Calendar icon opens popover; segments do not.
- ESC closes popover without committing; OK commits.
- Range modes show two segment groups and update from/to independently.
- `LocaleDeDE` shows `dd.MM.yyyy` order and 24h.

Stop the server when done.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/react-ui-calendar/src/components/DateTimePicker/DateTimePicker.stories.tsx
git commit -m "docs(react-ui-calendar): add DateTimePicker stories for every mode"
```

---

## Task 10: Final verification + push

- [ ] **Step 1: Full test + build + lint sweep**

Run:

```
moon run react-ui-calendar:lint -- --fix
moon run react-ui-calendar:build
moon run react-ui-calendar:test
```

Expected: all green.

- [ ] **Step 2: Verify `git status` is clean**

Run:

```
git status
```

Expected: `nothing to commit, working tree clean`.

If any files remain modified or untracked, decide per-file whether to commit or revert; do not leave unstaged changes.

- [ ] **Step 3: Push**

```bash
git push
```

- [ ] **Step 4: Watch CI**

```
gh run list --branch claude/condescending-galileo-30f588 --limit 5 --workflow "Check"
```

If the "Check" workflow fails, diagnose with `gh run view <id> --log-failed` and fix on this branch (do not merge around red CI).

- [ ] **Step 5: Update the PR description**

The PR already exists (https://github.com/dxos/dxos/pull/11466). Update the description to summarize the implementation work and link the spec.

```bash
gh pr view --json url --jq .url
gh pr edit --body "$(cat <<'EOF'
## Summary

- Adds a `DateTimePicker` namespaced primitive in `@dxos/react-ui-calendar` covering six modes (`date`, `date-time`, `date-range`, `date-time-range`, `time`, `time-range`).
- Segmented editable trigger (locale-aware, mirrors native `<input type="date">`) + popover with `Calendar.Grid` (rows=6, prev/next month nav) and numeric HH:MM time inputs.
- Extends `Calendar.Toolbar` with an opt-in `nav?: boolean` prop for prev/next month buttons.
- Controlled + uncontrolled value; locale-aware (12h/24h, segment order).
- Storybook story per mode; vitest unit tests cover the segment parser/formatter, value coercion, and the state hook.

Design spec: [docs/design/react-ui-date-time-picker.md](docs/design/react-ui-date-time-picker.md).

## Test plan

- [x] `moon run react-ui-calendar:test`
- [x] `moon run react-ui-calendar:build`
- [x] `moon run react-ui-calendar:lint -- --fix`
- [ ] Visual: every story in `ui/react-ui-calendar/DateTimePicker` opens, commits, cancels, and handles range endpoints.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

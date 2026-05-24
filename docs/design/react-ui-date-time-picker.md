# DateTimePicker (react-ui-calendar)

Status: Draft
Date: 2026-05-24
Owner: claude/condescending-galileo-30f588

## Summary

A namespaced `DateTimePicker` primitive in `@dxos/react-ui-calendar` that composes the existing `Calendar.Grid` with a segmented editable input trigger and a popover that contains the calendar plus numeric time inputs. Supports six modes: `date`, `date-time`, `date-range`, `date-time-range`, `time`, `time-range`. Locale-aware (12h/24h, segment order). Controlled and uncontrolled.

## Motivation

We have `Calendar.Grid` (infinite virtualized scroller, single-day + drag-range selection, keyboard nav). We need a *form-field* primitive on top of it for typical "pick a date/time" UX: a compact segmented input that behaves like the native `<input type="date">`, with a popover that opens via a calendar icon and lets the user pick day and time-of-day with an explicit commit.

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
export type DateTimePickerMode =
  | 'date' | 'date-time'
  | 'date-range' | 'date-time-range'
  | 'time' | 'time-range';

export type DateTimeRange = { from: Date; to: Date }; // alias of Calendar's Range

export type ValueFor<M extends DateTimePickerMode> =
  M extends 'date'             ? Date :
  M extends 'date-time'        ? Date :
  M extends 'date-range'       ? DateTimeRange :
  M extends 'date-time-range'  ? DateTimeRange :
  M extends 'time'             ? Date :
  M extends 'time-range'       ? DateTimeRange :
  never;
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
  step?: number;            // minute step, default 15
  hourCycle?: 'h12' | 'h23'; // default: from locale
  locale?: string;          // default: navigator.language
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
DateTimePicker.Root      // generic on mode
DateTimePicker.Input     // segmented trigger (calendar icon is Popover.Trigger)
DateTimePicker.Content   // popover content wrapper
DateTimePicker.Time      // HH:MM (+ AM/PM); rendered inside Content
DateTimePicker.Commit    // OK button
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

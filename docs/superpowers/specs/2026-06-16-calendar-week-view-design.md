# Calendar Week View (`Calendar.Week`) — Design

## Goal

Add a week / time-grid variant to `@dxos/react-ui-calendar` that reuses the existing
month grid's 7-day (x-axis) structure but maps the y-axis to hourly time slots, for
displaying and editing events within a single week.

## Scope

- New `CalendarWeek` component exported as `Calendar.Week`, sibling to `Calendar.Grid`.
- Factor the day-of-week header out of `CalendarGrid` into a shared `CalendarWeekdays`
  component used by both views.
- Faint hour grid lines; events rendered as positioned rectangles.
- Drag-to-create (vertical only, within one day), drag-to-move (preserve duration,
  vertical only), drag-to-resize (top/bottom edges, `ns-resize` cursor).
- Side-by-side layout for overlapping events.
- Non-virtualized vertical scroll (0–24h).

## Files

- `src/components/Calendar/Week.tsx` — new component.
- `src/components/Calendar/Weekdays.tsx` — shared day-of-week header.
- `src/components/Calendar/util.ts` — add time/overlap helpers (pure, unit-tested).
- `src/components/Calendar/util.test.ts` — tests for new helpers.
- `src/components/Calendar/Calendar.tsx` — use `CalendarWeekdays`.
- `src/components/Calendar/Calendar.stories.tsx` — add `Week` story.
- `src/components/Calendar/index.ts` (+ barrels) — export `Calendar.Week` and public types.

## Layout

- Shared CSS grid column template `[gutter] repeat(7, 1fr)` aligns header and body.
- Body is a single non-virtualized `overflow-y-auto` region; content height `24 * hourHeight`.
- Left gutter column shows hour labels; 7 day columns are `position: relative`, full day tall.
- Faint horizontal hour lines (theme separator token) at each hour boundary.
- Scrolls to ~08:00 on mount.
- `weekStartsOn` read from `Calendar.Root` context (like `Toolbar`).
- `date?: Date` prop selects the displayed week (default today); week = `startOfWeek(date, { weekStartsOn })` .. +6 days.

## Shared header — `CalendarWeekdays`

Props:

- `weekStartsOn: Day`
- `columnWidth?: number` — fixed px columns (month grid → 40); omitted → flex `1fr` (week view).
- `gutter?: number` — leading spacer width (week view aligns over the hour gutter).
- `dates?: Date[]` — when provided (week view), also render the day-of-month number.

`CalendarGrid` adopts it with no behavioral change (passes `columnWidth = 40`).

## Event model

Plain UI prop type (no ECHO dependency):

```ts
export type CalendarEvent = { id: string; title?: string; start: Date; end: Date };
```

Callbacks:

- `onEventCreate?: (event: { start: Date; end: Date }) => void`
- `onEventUpdate?: (event: { id: string; start: Date; end: Date }) => void` — move and resize.

## Overlap layout

Pure function in `util.ts`:

- Input: events for one day. Output: per-event `{ columnIndex, columnCount }`.
- Sort by start; build transitive overlap clusters; greedily pack each cluster's events
  into the first free column. `left = columnIndex / columnCount`, `width = 1 / columnCount`.

## Interactions (all vertical-only, snap to 15 minutes)

- **Create**: pointerdown on empty column area → pending rectangle anchored at that time;
  Δy sets the other edge; constrained to the origin day column; pointerup → `onEventCreate`.
- **Move**: pointerdown on event body (`cursor-move`) → start shifts by snapped Δy, duration
  preserved, day unchanged; pointerup → `onEventUpdate`.
- **Resize**: top/bottom handle strips (`cursor-ns-resize`); drag adjusts that edge only,
  minimum duration 15 min; pointerup → `onEventUpdate`.
- Gestures tracked with window `pointermove`/`pointerup` listeners and a `gestureRef`
  (`{ kind, eventId, anchorMinutes, ... }`), mirroring `CalendarGrid`'s drag bookkeeping.

## Time math (`util.ts`)

- `yToMinutes(y, hourHeight)`, `minutesToY(minutes, hourHeight)`.
- `snapMinutes(minutes, step = 15)`.
- `minutesOfDay(date)`, `setMinutesOfDay(date, minutes)`.

## Testing / verification

- Unit tests for snap/overlap/time helpers in `util.test.ts`.
- Visual verification in storybook for create/move/resize and overlap rendering.

## Out of scope (YAGNI)

- All-day event row, multi-week navigation, event deletion UI, keyboard editing,
  ECHO schema binding, timezone handling beyond local time.

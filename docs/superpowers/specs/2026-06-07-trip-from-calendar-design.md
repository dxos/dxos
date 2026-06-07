# Plan a trip from calendar events

Date: 2026-06-07
Status: Draft (decisions made autonomously; pending user review)

## Goal

Let a user turn a range of calendar events into a new Trip + itinerary in one action.
`plugin-trip` contributes the action into the calendar's menu (via the app-graph). The action
takes the events in the calendar's currently-selected date range (or, when nothing is selected,
the next N days from today — default 14, configurable). It immediately creates a Trip, navigates
to it, and runs a trip-planning blueprint that fills in connecting travel and accommodation while
the user looks at the new trip.

## Context / key facts

- There is **no `plugin-calendar` package**. The calendar is the `Calendar` ECHO type +
  `CalendarArticle` in **`plugin-inbox`**; events come from the calendar's feed and render through
  `@dxos/react-ui-calendar`'s `Calendar.Grid`.
- `Calendar.Grid` already supports `onSelectRange({ range: { from: Date; to: Date } })`; today
  `CalendarArticle` only wires `onSelect` (single day).
- The Selection manager (`@dxos/react-ui-attention`) supports a `'range'` mode storing
  `{ from?: string; to?: string }`. We store ISO date strings there.
- `plugin-trip` already depends on `@dxos/plugin-inbox`, `@dxos/plugin-attention`,
  `@dxos/app-toolkit`, `@dxos/types`. It does **not** yet depend on `@dxos/plugin-assistant`.
- Operations/blueprints use `@dxos/compute` (`Operation`, `Blueprint`, `Template`), not
  `@dxos/operation`. `Blueprint.Definition = { key, make }`; handlers are supplied separately via
  the plugin's `OperationHandlerSet`.
- `AssistantOperation.RunPromptInNewChat` (exported from `@dxos/plugin-assistant`) binds
  `objects` + `blueprints` to a new chat and, with `background: true`, runs the agent without
  navigating away. Blueprints are matched by meta key against `Blueprint.Blueprint` objects in the
  space db.
- `ActivityDetails = { title?, venue?: Place, departAt?, arriveAt? }`.
  `Place = { name?, code?, city?, country?, geo? }`.

## Decisions

1. **`Event.location`** — single optional `Geo.PostalAddress` (schema.org `Event.location`).
2. **Events → segments** — map **only events that have a `location`** to an `activity` segment.
   Events with no address are skipped (they are not itinerary stops).
3. **Operation input** — `{ calendar, events }`. The app-graph action resolves the range and
   queries the events; the operation builds the trip. The trip span is derived from the events.
4. **Blueprint** — a new trip-planning blueprint, tooled with a new `AddSegment` operation plus the
   existing `PlanRoute` and `SearchBookings`, so the agent can actually build the itinerary.
5. **Run mechanism** — `AssistantOperation.RunPromptInNewChat` with `background: true`, binding the
   new trip and the planning blueprint. Navigation to the trip is a separate `LayoutOperation.Open`.
6. **Default window** — `DEFAULT_PLANNING_WINDOW_DAYS = 14`, configurable via plugin settings,
   bridged to the (headless) action through a process-level holder like `tripGapDays`.
7. **Trip name** — default `"Trip · {Mon D – Mon D}"` from the span when no name given.

## Architecture / components

### 1. Schema: `Event.location` (`packages/sdk/types/src/types/Event.ts`)
Add `location: Geo.PostalAddress.pipe(Schema.optional)` after `endDate`; import `* as Geo`.
Remove the prior location-placeholder comment on the schema.

### 2. Config holder (`plugin-trip/src/operations/extractor/config.ts`)
Add `DEFAULT_PLANNING_WINDOW_DAYS = 14` + `getPlanningWindowDays()` / `setPlanningWindowDays()`,
mirroring `tripGapDays`.

### 3. Settings (`plugin-trip/src/types/Settings.ts`, `capabilities/settings.ts`)
Add optional `tripPlanningWindowDays` (int ≥ 1). Sync it into `setPlanningWindowDays` alongside the
existing gap sync.

### 4. Operations (`plugin-trip`)
- **`CreateTripFromEvents`** (def in `types/TripOperation.ts`, handler
  `operations/create-trip-from-events.ts`):
  - input `{ calendar: Schema.Any; events: Schema.Array(Schema.Any) }`, output `{ trip }`
    (ECHO objects passed as `Schema.Any` and narrowed in the handler, matching `MergeTrip`).
  - Pure helper `eventsToSegments(events)` (own file, unit-tested): for each event with a
    `location`, build an `activity` `Segment` — `title = event.title`, `venue` = Place from the
    PostalAddress (`city = locality`, `country = country`, `name = street ?? locality ?? title`),
    `departAt = startDate`, `arriveAt = endDate`.
  - Build `Trip.make({ name, start, end })` (span = min start / max end across the events),
    `db.add(trip)` (db from `Obj.getDatabase(calendar)`), attach segments via `Trip.addSegment`.
  - Navigate: `LayoutOperation.Open` to the trip path.
  - Run blueprint: `AssistantOperation.RunPromptInNewChat({ db, objects: [trip],
    blueprints: [TRIP_PLANNING_KEY], prompt: <kickoff>, background: true })`, wrapped in
    `Effect.catchAll` so a missing assistant runtime (tests/headless) does not fail trip creation.
  - Return `{ trip }`.
- **`AddSegment`** (def + handler `operations/add-segment.ts`): input
  `{ trip: Schema.Any; kind: Segment.Kind; details?: Schema.Any }`, output `{ segmentId }`.
  Creates `Segment.makeDefault(kind)` (merging any `details`), `db.add`, `Trip.addSegment`.
  Registered in `TripOperationHandlerSet`.

### 5. Blueprint (`plugin-trip/src/blueprints/trip-planning-blueprint.ts`)
Key `${meta.id}/blueprint/planning`. Tools = `[AddSegment, RoutingOperation.PlanRoute,
BookingOperation.SearchBookings]`. Instructions: given a trip whose `activity` segments are fixed
appointments at addresses (sorted by time), insert `road`/`transfer` segments connecting
consecutive stops and `accommodation` for overnight gaps; use `PlanRoute` to geocode/route and
`SearchBookings` for transport options; do not invent confirmations. Export from `blueprints/index.ts`.
`capabilities/blueprint-definition.ts` contributes both `BookingBlueprint` and `TripPlanningBlueprint`.
`Trip.Trip` gets `BlueprintsAnnotation.set([TRIP_PLANNING_KEY])` (import from `@dxos/app-toolkit`).

### 6. App-graph action (`plugin-trip/src/capabilities/app-graph-builder.ts`)
New extension matching `Calendar.instanceOf(node.data)` (import `Calendar` from `@dxos/plugin-inbox`),
mirroring inbox's `syncCalendar`. Action "Plan trip from calendar":
- At click time read the node's `'range'` selection from `AttentionCapabilities.Selection`
  (`{ from, to }` ISO dates). If absent, default to `today … today + getPlanningWindowDays()`.
- Query events from `calendar.feed` within `[from, to]` (`Query.select(Filter.type(Event.Event)).from(feed)`,
  filter by `startDate`); invoke `CreateTripFromEvents({ calendar, events })`.

### 7. Calendar range wiring (`plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx`)
Wire `onSelectRange` on `Calendar.Grid` to write `{ mode: 'range', from: fromISO, to: toISO }` into
the Selection manager for the calendar context id, via `LayoutOperation.Select`.

### 8. Translations + deps
Add label strings (`trip.plan-from-calendar.label`, blueprint name, notify titles). Add
`@dxos/plugin-assistant` as a `workspace:*` dependency of `plugin-trip` (no cycle: plugin-assistant
does not depend on plugin-trip/inbox).

## Data flow

select range in CalendarArticle → Selection('range') → click "Plan trip from calendar" →
action resolves range (or default window) + queries events → `CreateTripFromEvents` →
build activity segments from located events → create + persist Trip → `LayoutOperation.Open(trip)` →
`RunPromptInNewChat(background, objects=[trip], blueprints=[planning])` → agent adds travel/lodging.

## Error handling

- No located events in range → still create the Trip spanning the range (blueprint can help); the
  action's notify reports how many stops were added.
- Missing assistant runtime (tests/headless) → blueprint run is `catchAll`-logged; trip creation and
  navigation still succeed.
- No feed / no db on the calendar → action contributes no item (guard like inbox extensions).

## Testing

- **Unit** (`eventsToSegments.test.ts`): events with/without `location` → only located ones become
  `activity` segments; PostalAddress→Place mapping; span derivation.
- **Integration** (`create-trip-from-events.test.ts`, `AssistantTestLayer`): seed a `Calendar` + feed
  with events (some located), invoke `CreateTripFromEvents`, assert a `Trip` with the expected
  `activity` segments and span is created. Blueprint run stubbed/absent.
- Live verification in Composer: select a calendar range, run the action, confirm navigation +
  companion chat activity.

## Out of scope (first draft)

- Surfacing the blueprint chat inline in the Trip article (relies on existing companion chat UX).
- Auto-binding blueprints from `BlueprintsAnnotation` when an object is viewed (not yet implemented
  in the assistant; we bind explicitly via `RunPromptInNewChat`).

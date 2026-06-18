# Phase 2 Scope — plugin-trip

> Phase 1 (this PR) shipped: `Trip` + `Segment` ECHO types, `Provider` / `Account` in `@dxos/types`, `TripArticle` (calendar + stack + map views), `SegmentArticle` companion with Form-driven editing for Flight & Accommodation, drag-and-keyboard range selection in `react-ui-calendar`, and graph-builder wiring for the segment companion.
>
> Phase 2 builds on that foundation. Items are grouped by theme; each is independently scopable into its own PR.

---

## 1. Editing & data input

### 1.1 DateTimePicker component (`@dxos/react-ui-pickers`)

- Wrap our existing `Calendar.Root` + `Calendar.Grid` (from `@dxos/react-ui-calendar`) inside a Radix `Popover` with a button trigger that displays the formatted date+time.
- Add a small time row (hour + minute, AM/PM in 12h locales) — two `Input.TextInput type='number'` or our own spinner.
- Controlled value as ISO string; emits `onValueChange`.
- Replace `SegmentArticle`'s native `<input type='datetime-local'>` (`DateTimeField`) with this picker via the form's `fieldMap` for `departAt`, `arriveAt`, `checkIn`, `checkOut`.
- Story with single and range variants.

### 1.2 Editable forms for remaining segment kinds

- Currently only `flight` and `accommodation` have Form-driven edit UIs in `SegmentArticle`; `train`, `boat`, `road`, `activity` are read-only Row layouts.
- Define `TrainProperties`, `BoatProperties`, `RoadProperties`, `ActivityProperties` schemas (same pattern as `FlightProperties` / `AccommodationProperties`), wire `Form.Root` + `Form.FieldSet` per kind.

### 1.3 Place autocomplete / geocoding

- `Place.geo` is currently hand-populated in `TripBuilder` fixtures and unused on user-entered segments.
- Add a `PlaceField` that resolves `name`/`code` to coordinates via a geocoding service (or a built-in airport database for flights). Updates `Place.geo` so the map view plots user-created segments.
- Could be backed by a `PlaceProvider` capability so different plugins supply different resolvers (airline-only, full-geocoder, offline DB).

### 1.4 Booking management

- `Booking` is a typed ECHO object but currently only used by `TravelMessageExtractor` flows (not yet shipped).
- Add a Booking detail surface and a way to attach a Booking to a Segment from the SegmentArticle (existing or new). Attachments (`Ref<File>[]`) should be drop-target enabled.

---

## 2. Inbox integration (deferred from Phase 1)

### 2.1 `MessageExtractor` contract (`plugin-inbox`)

- Generic `MessageExtractor` capability: `{ id, description, kinds[], match(msg) → MatchResult, extract(ctx, msg) → ExtractResult }`.
- `ExtractedFrom` ECHO relation linking the extracted object → source `Message`.
- Inbox dispatch modes: manual (user picks), agent-assisted (extractors are tools), auto-on-arrival (off by default, opt-in per Mailbox).

### 2.2 `TravelMessageExtractor` (plugin-trip)

- Recognises common booking-confirmation email shapes (UA / BA / Booking.com / etc.).
- Produces a `Booking` + one or more `Segment` ECHO objects (using `Trip.addSegment`), attaches an `ExtractedFrom` relation back to the email.
- Dedupes against existing `Account` rows by `(provider.domain, accountNumber)`.
- Initial v1 can be a heuristic parser; later v2 an agent-backed parser.

### 2.3 `CalendarEventSource` contract (`plugin-inbox`)

- Pluggable contract that projects external sources into calendar events.
- plugin-inbox calendar views query every registered source for a time range.

### 2.4 `TripCalendarSource` (plugin-trip)

- Implementation of the above: projects `Segment`s into `CalendarEventLike` values.
- Flight/train/boat/road: `start = departAt`, `end = arriveAt`. Accommodation: `start = checkIn`, `end = checkOut`. Activity: point in time.

---

## 3. Multi-leg search (deferred from Phase 1)

### 3.1 `SegmentRequest` shape

- Models "I want to fly NYC → LON sometime Mon-Tue, ≤ £600". Distinct from a tentative `Segment` (which has fixed dates).
- Search providers (manual, agent, third-party) consume `SegmentRequest` and produce candidate `Booking + Segment` pairs.
- On accept, materializes the candidate into the Trip.

### 3.2 Search provider contract

- `SegmentSearchProvider` capability that plugins (or external integrations) can register. plugin-trip ships the contract + a manual UI for demo; real providers come from integrations.

---

## 4. Map view enhancements

### 4.1 Animated tour

- Sequential animated path through itinerary points using `useTour` from `@dxos/react-ui-geo`. Toolbar button to start/stop.

### 4.2 Time scrubber

- Slider along the bottom that highlights the segment(s) active at the selected time. Drag to scrub through the trip.

### 4.3 Selection sync

- Clicking a point on the globe should select the corresponding segment (open companion). Selected segment's point should be visually highlighted.

---

## 5. Data model follow-ups

### 5.1 `BookingFor` relation

- `Booking` → `Trip` typed relation. Enables direct queries like "all bookings for this trip" without walking `trip.segments[].booking`.

### 5.2 Cruise vs. ferry split

- Currently `kind: 'boat'` covers both. Split when usage warrants richer cruise-specific fields (itinerary stops, dining packages).

### 5.3 Road subKind expansion

- Promote `subKind` to its own kind (`bus`, `car`, `transfer`, `taxi`, `walk`) if those flows diverge enough to need distinct fields.

### 5.4 Provider unification

- `AccessToken.source: Hostname` could be replaced with `Provider`. Same for any other places we currently store a bare provider name.

---

## 6. UX & app integration

### 6.1 Mobile / narrow layout

- Stack/companion currently relies on `@3xl:grid-cols-[min-content_1fr]`; below that breakpoint the calendar is hidden. Design and implement a mobile-friendly layout (toolbar tabs? bottom sheet?).

### 6.2 Defaults & onboarding

- plugin-trip is registered but not in `getDefaults` (matches Trello/Voxel pattern). Decide: ship enabled by default, or keep behind registry. If enabled, add an empty-state with a "Create a trip" CTA in the Welcome flow.

### 6.3 Operations registry

- Right-click a calendar event → "Add to trip". Right-click a contact → "Add traveller to trip". Right-click an email → "Extract booking" (uses `MessageExtractor`).

### 6.4 Sharing / collaborators

- Invite people to a Trip space. Per-segment "travellers" already supported on Booking — expose at Trip level too.

### 6.5 Trip templates

- Save a Trip as a template; instantiate with new dates.

---

## 7. Testing & docs

### 7.1 Unit tests

- Phase 1 has none — Storybook is the only verification. Add tests for `Trip.addSegment` / `removeSegment`, `Segment` helpers, graph-builder resolution, and `getRowIndex` (already burned us once with DST).

### 7.2 PLUGIN.mdl refresh

- Update to reflect the actual ECHO Segment type (currently still describes the tagged union from Phase 1 design).
- Document the surfaces (TripArticle, SegmentArticle, TripMapView) and graph-builder extension.

### 7.3 Storybook coverage

- Each new editable form (Train/Boat/Road/Activity) gets a SegmentArticle variant.
- Map view variants for empty / single-segment / multi-continent.

### 7.4 E2E

- composer-app e2e: create a trip, add a flight via UI, drag-select range on calendar, switch to map view, edit a flight in the companion, verify persistence across reload.

---

## Suggested PR slicing

Pull these into independent PRs, roughly in priority order:

1. **DateTimePicker** (1.1) — small, immediately useful.
2. **Editable forms for remaining kinds** (1.2) — completes the editing story.
3. **PLUGIN.mdl refresh + unit tests** (7.1–7.2) — pays down debt.
4. **MessageExtractor + TravelMessageExtractor** (2.1, 2.2) — the headline integration.
5. **TripCalendarSource** (2.3, 2.4) — natural follow-up to #4.
6. **Map enhancements** (4.x) — polish.
7. **Place autocomplete** (1.3) — depends on a geocoder pick.
8. **SegmentRequest + search** (3.x) — bigger feature.
9. **Mobile layout** (6.1) — separate UX project.

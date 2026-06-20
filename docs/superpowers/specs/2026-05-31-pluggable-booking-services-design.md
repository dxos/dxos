# Pluggable Booking Services + plugin-duffel

Date: 2026-05-31
Status: Approved (design)

## Summary

Extend `plugin-trip` so that travel segments can be filled via pluggable
**booking services** — starting with flight search. `plugin-trip` defines a
`BookingService` capability and a search component; other plugins contribute
implementations. The first implementation, `plugin-duffel`, wraps the
[Duffel REST API](https://duffel.com/docs/api/overview/welcome) for flight
offer search.

Scope for this first cut is **search only**: a search returns offers; selecting
an offer fills the Segment's flight details and creates a local `Booking` ECHO
object. No real order/purchase is placed through Duffel.

## Goals

- `plugin-trip` defines a `BookingService` capability that other plugins implement.
- Generalized, extensible `SearchQuery` / `Offer` types that mirror the
  discriminated-union + mixin pattern already used by `Segment` (today only the
  `flight` variant is populated; `train`/`accommodation`/etc. are additive later).
- Search is implemented as a first-class **`SearchBookings` operation** (resolves
  the contributed `BookingService`s and runs the query) so it can be driven by the
  UI **and invoked by the assistant** via a skill tool.
- A booking search component in `plugin-trip` that invokes the operation,
  reachable from a toolbar toggle on the segment surface.
- `plugin-duffel`: a new plugin implementing `BookingService` against Duffel,
  with a settings panel for the API key and **no feature UI components**.

## Non-Goals

- Real Duffel order placement / payment (deferred).
- Multi-day "date range" fan-out search (single departure date for now).
- Non-flight booking kinds (train, accommodation, …) — the types are designed to
  accept them additively, but only `flight` is implemented.
- App-graph changes — segment navigation continues via the existing
  companion-on-selection mechanism (no "segments as children").

## Architecture

```
plugin-trip (defines + consumes)                 plugin-duffel (implements)
┌───────────────────────────────┐               ┌────────────────────────────────┐
│ types/TripCapabilities.ts      │               │ DuffelBookingService            │
│   BookingService capability    │◀──contributes─│   {id:'duffel', kinds:['flight']│
│ types/BookingSearch.ts         │               │    search()}                    │
│   SearchQuery / Offer (Schema) │──imports──────▶ (uses SearchQuery/Offer types)  │
│ containers/BookingSearch       │               │ services/DuffelClient           │
│   resolves services, runs query│               │   thin REST via CORS proxy      │
│ SegmentArticle toolbar toggle  │               │ Settings (apiKey, KVS)          │
│   Form ⇄ Search                │               │ Settings panel surface (only UI)│
└───────────────────────────────┘               └────────────────────────────────┘
```

## Data Model (plugin-trip)

### Capability

`packages/plugins/plugin-trip/src/types/TripCapabilities.ts` (new):

```ts
// @import-as-namespace
import { Capability } from '@dxos/app-framework';
import { meta } from '#meta';
import type { BookingService } from './BookingSearch';

export const BookingService = Capability.make<BookingService>(`${meta.id}.capability.bookingService`);
```

Exported from the types barrel as `TripCapabilities`.

### Query / Offer types

`packages/plugins/plugin-trip/src/types/BookingSearch.ts` (new). Plain Effect
`Schema` structs — **transient**, not ECHO `Type.makeObject`. They mirror
`Segment` (a shared mixin extended by per-kind tagged structs, discriminated by
the same `Segment.Kind` literal).

```ts
// Shared mixin (parallels Segment.TransportFields).
const TransportSearchFields = Schema.Struct({
  origin: Schema.optional(Schema.String), // IATA
  destination: Schema.optional(Schema.String), // IATA
  departureDate: Schema.optional(Format.DateTime),
  returnDate: Schema.optional(Format.DateTime),
  cabinClass: Schema.optional(Segment.ServiceClass),
  carrier: Schema.optional(Schema.String), // preferred airline IATA
  passengers: Schema.optional(Schema.Number), // default 1
});

export const FlightSearchQuery = Schema.extend(TransportSearchFields, Schema.TaggedStruct('flight', {}));
export const SearchQuery = Schema.Union(FlightSearchQuery /*, TrainSearchQuery, … */);
export interface SearchQuery extends Schema.Schema.Type<typeof SearchQuery> {}

const FlightSliceFields = Schema.Struct({
  origin: Schema.Struct({ code: Schema.String, name: Schema.optional(Schema.String) }),
  destination: Schema.Struct({ code: Schema.String, name: Schema.optional(Schema.String) }),
  departAt: Schema.optional(Format.DateTime),
  arriveAt: Schema.optional(Format.DateTime),
  marketingCarrier: Schema.optional(Schema.String),
  flightNumber: Schema.optional(Schema.String),
  durationMinutes: Schema.optional(Schema.Number),
});

export const FlightOffer = Schema.TaggedStruct('flight', {
  id: Schema.String, // Duffel offer id
  provider: Schema.String, // 'duffel'
  carrier: Schema.Struct({ name: Schema.String, iataCode: Schema.optional(Schema.String) }),
  totalAmount: Schema.Number,
  currency: Schema.String,
  cabinClass: Schema.optional(Segment.ServiceClass),
  slices: Schema.Array(FlightSliceFields),
});
export const Offer = Schema.Union(FlightOffer /*, … */);
export interface Offer extends Schema.Schema.Type<typeof Offer> {}
```

### Service interface

```ts
export interface BookingService {
  readonly id: string; // 'duffel'
  readonly label: string; // 'Duffel'
  readonly kinds: readonly Segment.Kind[]; // ['flight']
  search(query: SearchQuery): Promise<readonly Offer[]>;
}
```

Promise-based (not Effect) because the primary consumer is a React component;
implementations may use Effect internally. A `MissingApiKeyError` (or similar
structured error) is thrown by implementations lacking credentials, and surfaced
in the search UI.

## `SearchBookings` operation + assistant skill (plugin-trip)

Search is an Operation, not a direct service call, so the same code path serves
the UI and the assistant.

- `types/BookingOperation.ts` defines `SearchBookings` via `Operation.make`
  (`Operation` from `@dxos/compute`):
  - `input`: `{ query: SearchQuery, provider?: string }`.
  - `output`: `{ offers: Offer[] }`.
  - `services: [Capability.Service]`.
- `operations/search-bookings.ts` handler resolves
  `Capability.getAll(TripCapabilities.BookingService)`, filters services by
  `query._tag` (kind) and optional `provider` id, calls `service.search(query)`,
  returns the offers. (Same in-handler capability-resolution pattern as
  plugin-inbox's `extract-message` operation.)
- Registered into the existing `TripOperationHandlerSet` /
  `Capabilities.OperationHandler` contribution.
- **Assistant exposure**: a `booking-skill.ts` exposes `SearchBookings` as a
  tool via `Skill.toolDefinitions({ operations: [SearchBookings] })`,
  contributed through `AppCapabilities.SkillDefinition` and wired with
  `AppPlugin.addSkillDefinitionModule` (mirrors plugin-product-search).

> Applying a chosen offer to the segment (the write below) stays a UI action in
> this first cut. A follow-up `AddOfferToSegment` operation would let the
> assistant complete a booking end-to-end; deferred.

## Booking search component (plugin-trip)

`packages/plugins/plugin-trip/src/containers/BookingSearch/BookingSearch.tsx`:

- Resolves all contributed `BookingService`s via the capability system (for the
  provider picker + empty state), filtered to those whose `kinds` include the
  current segment's kind.
- If more than one matches, shows a **provider picker** defaulting to the first
  available (Duffel). If exactly one, no picker.
- Renders a query form: origin, destination, departureDate, optional returnDate,
  cabinClass, passengers, optional carrier. Seeds initial values from the
  segment's existing `details` where present.
- Runs the search by **invoking the `SearchBookings` operation**
  (`useOperationInvoker().invokePromise`) and renders the returned `Offer[]`.
  Shows loading / empty / error states (including missing-API-key — detected by
  error `name`, since the error class may not survive the operation boundary).
- **Selecting an offer** (search-only):
  1. Writes the first slice into the Segment's `FlightDetails`
     (`provider`, `number`, `origin`, `destination`, `departAt`, `arriveAt`,
     `serviceClass`) via `Obj.update` / `Obj.setValue`, mapping slice codes →
     `Place` (`code`, `name`).
  2. Creates a `Booking` ECHO object: `provider`, `currency`,
     `totalPrice = totalAmount`, `source: 'import'`,
     `rawPayload = JSON.stringify(offer)`.
  3. Sets `segment.booking = Ref.make(booking)`.
- A helper module (`offer-to-segment.ts`) holds the offer → Segment/Booking
  mapping so it is unit-testable independent of React.

### SegmentArticle toolbar toggle

`SegmentArticle` gains a toolbar with a segmented toggle: **Form** ⇄ **Search**.

- Default selection = **Search** when `segment.booking` is unset; otherwise **Form**.
- The user can always switch either way (the toolbar drives the view; it is not a
  hard conditional on booking presence).
- **Form** renders the existing schema `Form`. **Search** renders `BookingSearch`.
- Search view is offered for flight segments in this first cut. For non-flight
  kinds (no matching service) the toggle still renders but Search shows an
  empty/"no providers" state.

## plugin-duffel (new package)

Location: `packages/plugins/plugin-duffel/`. `"private": true`. No feature UI
components — the **settings panel is the only UI surface** (and is required).

### Settings

- `types/Settings.ts`: `Schema.mutable(Schema.Struct({ apiKey: Schema.optional(Schema.String.annotations({ title: 'API key', … })) }))`.
- `capabilities/settings.ts`: `createKvsStore({ key: meta.id, schema: Settings, defaultValue: () => ({ apiKey: undefined }) })`; contributes a plugin-local settings capability **and** `AppCapabilities.Settings`.
- A settings surface (`AppSurface.settings(...)`) renders a `SettingsForm.FieldSet`
  bound to the schema (the `plugin-generator` pattern).

### DuffelClient (thin REST client)

`services/DuffelClient.ts`. Hand-rolled against Duffel's documented REST API,
routed through the **DXOS edge CORS proxy** (`proxyFetchLegacy` from
`@dxos/edge-client`), mirroring
`packages/plugins/plugin-discord/src/services/proxy-http-client.ts`:

- Target rewritten to `https://cors-proxy.dxos.workers.dev/api.duffel.com/...`.
- `Authorization: Bearer <apiKey>` remapped to `X-Cors-Proxy-Authorization`.
- Headers: `Duffel-Version: v2`, `Accept: application/json`, `Content-Type: application/json`.
- Search call: `POST /air/offer_requests?return_offers=true` with body
  `{ data: { slices, passengers, cabin_class } }`; read `data.offers` from the response.

Rationale for not using `@duffel/api`: the official client owns its HTTP layer
(fixed base URL, sets `Authorization` itself) and exposes no hook to route through
the CORS proxy, so it cannot run in-browser. The hand-rolled client targets
Duffel's published request/response contract verbatim and reuses the proven proxy
plumbing. (If Duffel calls move server-side later — e.g. for real order placement
— revisiting `@duffel/api` there is reasonable.)

### BookingService contribution

`services/DuffelBookingService.ts` builds `{ id: 'duffel', label: 'Duffel',
kinds: ['flight'], search }`. The contribution closes over the settings atom and
reads the current `apiKey` at `search()` time; missing key → structured error.
`search()`:

1. Maps `FlightSearchQuery` → Duffel offer-request body
   (slices from origin/destination/departureDate, optional return slice, passenger
   count, cabin_class from `cabinClass`).
2. Calls `DuffelClient`.
3. Maps Duffel offers → `FlightOffer[]` (carrier, total_amount/currency, cabin,
   slices → `FlightSliceFields`).

Mapping lives in a pure `duffel-mapping.ts` for unit testing.

### Wiring

`DuffelPlugin.tsx`: `meta`, settings module, surface module (settings panel),
translations module, and a module that `contributes(TripCapabilities.BookingService,
DuffelBookingService)`. The `SearchQuery`/`Offer` schemas are imported from
`@dxos/plugin-trip` (no duplicate schema module). `package.json` depends on
`@dxos/plugin-trip` (`workspace:*`), `@dxos/edge-client` (`workspace:*`),
app-framework/app-toolkit/effect/react-ui-form, etc.

## App graph

No change. Segment navigation continues via the existing
companion-on-selection mechanism in `plugin-trip`'s `app-graph-builder.ts`.

## Error handling

- Missing API key → structured error from `search()`, rendered as an actionable
  message in `BookingSearch` (link/hint to settings).
- Network / proxy / non-2xx Duffel responses → caught, surfaced as a search error
  state; raw error logged via `@dxos/log`.
- Empty offer list → explicit empty state.

## Testing

- **plugin-duffel** (`duffel-mapping.test.ts`): `FlightSearchQuery` → Duffel
  offer-request body, and a recorded Duffel offer JSON → `FlightOffer[]`. No live
  network in CI. An optional live smoke test against the test key is skipped in CI.
- **plugin-trip** (`offer-to-segment.test.ts`): offer → Segment `FlightDetails`
  write + `Booking` creation + `segment.booking` ref.
- **plugin-trip** (`search-bookings.test.ts`): `SearchBookings` handler resolves a
  stub `BookingService`, filters by kind/provider, returns its offers (and `[]`
  when no service matches), via an inline `OperationHandlerSet` + provided
  `Capability.Service` (pattern from inbox's `extract-message.test.ts`).
- **Storybook**: `BookingSearch.stories.tsx` with a stub `BookingService`
  returning fixture offers (no network), exercising query form, results, provider
  picker, empty, and error states.

## Open considerations (deferred)

- Real order placement / payment.
- Multi-day date-range / flexible search (fan-out of offer requests).
- Additional booking kinds (train, accommodation) — additive tagged members.
- Persisting/caching searches as ECHO objects (currently transient).

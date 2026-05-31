# Pluggable Booking Services + plugin-duffel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pluggable `BookingService` capability + flight-search UI to `plugin-trip`, and a new `plugin-duffel` that implements it against the Duffel REST API.

**Architecture:** `plugin-trip` defines the `BookingService` capability and transient `SearchQuery`/`Offer` Effect schemas (mirroring the Segment mixin + tagged-union pattern). A `BookingSearch` container resolves all contributed services, runs a query, and on offer-select writes flight details + a `Booking` ECHO object onto the segment. `SegmentArticle` gains a toolbar toggle (Form ⇄ Search). `plugin-duffel` contributes a `BookingService` whose `search` calls Duffel `POST /air/offer_requests?return_offers=true` through the DXOS edge CORS proxy, plus a settings panel for the API key. Scope is search-only — no real order placement. App-graph behavior is unchanged.

**Tech Stack:** TypeScript, Effect `Schema`, `@dxos/echo` (`Obj`/`Ref`), `@dxos/app-framework` capabilities, `@dxos/react-ui` + `@dxos/react-ui-form`, `@dxos/edge-client` (`proxyFetchLegacy`), vitest via `moon`, Storybook.

**Reference design:** `docs/superpowers/specs/2026-05-31-pluggable-booking-services-design.md`

**Conventions (from CLAUDE.md):** single quotes; arrow functions; no `as` casts to silence types; `@dxos` workspace deps are `workspace:*` (never catalog); new packages set `"private": true`; comments end with a period; barrel imports; tests use `describe`/`test('x', ({ expect }) => ...)`.

---

## File Structure

### plugin-trip (modify)

- Create `packages/plugins/plugin-trip/src/types/BookingSearch.ts` — `SearchQuery`/`Offer` schemas, `BookingService` interface, `MissingApiKeyError`.
- Create `packages/plugins/plugin-trip/src/types/BookingSearch.test.ts` — schema round-trip tests.
- Create `packages/plugins/plugin-trip/src/types/TripCapabilities.ts` — `BookingService` capability id.
- Modify `packages/plugins/plugin-trip/src/types/index.ts` — export the two new namespaces.
- Create `packages/plugins/plugin-trip/src/containers/BookingSearch/offer-to-segment.ts` — pure offer→details/booking mappers.
- Create `packages/plugins/plugin-trip/src/containers/BookingSearch/offer-to-segment.test.ts`.
- Create `packages/plugins/plugin-trip/src/containers/BookingSearch/BookingSearch.tsx` — search container.
- Create `packages/plugins/plugin-trip/src/containers/BookingSearch/BookingSearch.stories.tsx`.
- Create `packages/plugins/plugin-trip/src/containers/BookingSearch/index.ts`.
- Modify `packages/plugins/plugin-trip/src/containers/index.ts` — export `BookingSearch`.
- Modify `packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx` — toolbar Form ⇄ Search toggle.
- Modify `packages/plugins/plugin-trip/src/translations.ts` — booking-search keys.

### plugin-duffel (new package `packages/plugins/plugin-duffel/`)

- `package.json`, `tsconfig.json`, `moon.yml`
- `src/index.ts`, `src/meta.ts`, `src/plugin.ts`, `src/DuffelPlugin.tsx`, `src/translations.ts`
- `src/types/index.ts`, `src/types/Settings.ts`, `src/types/DuffelCapabilities.ts`
- `src/services/index.ts`, `src/services/duffel-mapping.ts`, `src/services/duffel-mapping.test.ts`, `src/services/DuffelClient.ts`, `src/services/DuffelBookingService.ts`
- `src/capabilities/index.ts`, `src/capabilities/duffel.ts`, `src/capabilities/react-surface.tsx`
- `src/containers/index.ts`, `src/containers/DuffelSettings/DuffelSettings.tsx`, `src/containers/DuffelSettings/index.ts`

### app integration (modify)

- `packages/apps/composer-app/package.json` — add `@dxos/plugin-duffel` dep.
- `packages/apps/composer-app/tsconfig.json` — add project reference.
- `packages/apps/composer-app/src/plugin-defs.tsx` — import, register instance, list meta id.

---

## PART A — plugin-trip: capability + types

### Task 1: `SearchQuery` / `Offer` schemas + `BookingService` interface

**Files:**
- Create: `packages/plugins/plugin-trip/src/types/BookingSearch.ts`
- Test: `packages/plugins/plugin-trip/src/types/BookingSearch.test.ts`

- [ ] **Step 1: Write `BookingSearch.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Format } from '@dxos/echo';

import * as Segment from './Segment';

/**
 * Transient search/offer types shared by plugin-trip and booking-service
 * implementations (e.g. plugin-duffel). These are NOT ECHO objects — they are
 * plain Effect schemas passed across the BookingService capability boundary.
 *
 * The shape mirrors `Segment`: a shared field mixin (`FlightSearchFields`)
 * extended into a tagged variant (`FlightSearchQuery`), discriminated by the
 * same `Segment.Kind` literal so non-flight kinds (train, accommodation, …)
 * can be added later as additional tagged members with no signature changes.
 */

/** Shared query fields (parallels `Segment.TransportFields`). Used directly as the input-form schema. */
export const FlightSearchFields = Schema.Struct({
  origin: Schema.optional(Schema.String.annotations({ title: 'Origin', description: 'IATA code', examples: ['JFK'] })),
  destination: Schema.optional(
    Schema.String.annotations({ title: 'Destination', description: 'IATA code', examples: ['LHR'] }),
  ),
  departureDate: Schema.optional(Format.DateTime.annotations({ title: 'Departure' })),
  returnDate: Schema.optional(Format.DateTime.annotations({ title: 'Return' })),
  cabinClass: Schema.optional(Segment.ServiceClass),
  carrier: Schema.optional(Schema.String.annotations({ title: 'Carrier', description: 'Preferred airline IATA code' })),
  passengers: Schema.optional(Schema.Number.annotations({ title: 'Passengers' })),
});
export interface FlightSearchFields extends Schema.Schema.Type<typeof FlightSearchFields> {}

export const FlightSearchQuery = Schema.extend(FlightSearchFields, Schema.TaggedStruct('flight', {}));
export interface FlightSearchQuery extends Schema.Schema.Type<typeof FlightSearchQuery> {}

/** Discriminated union of all query kinds. Today only `flight` is populated. */
export const SearchQuery = Schema.Union(FlightSearchQuery);
export type SearchQuery = Schema.Schema.Type<typeof SearchQuery>;

/** A single leg within an offer. */
export const FlightSliceFields = Schema.Struct({
  origin: Schema.Struct({ code: Schema.String, name: Schema.optional(Schema.String) }),
  destination: Schema.Struct({ code: Schema.String, name: Schema.optional(Schema.String) }),
  departAt: Schema.optional(Format.DateTime),
  arriveAt: Schema.optional(Format.DateTime),
  marketingCarrier: Schema.optional(Schema.String),
  flightNumber: Schema.optional(Schema.String),
  durationMinutes: Schema.optional(Schema.Number),
});
export interface FlightSliceFields extends Schema.Schema.Type<typeof FlightSliceFields> {}

export const FlightOffer = Schema.TaggedStruct('flight', {
  id: Schema.String,
  provider: Schema.String,
  carrier: Schema.Struct({ name: Schema.String, iataCode: Schema.optional(Schema.String) }),
  totalAmount: Schema.Number,
  currency: Schema.String,
  cabinClass: Schema.optional(Segment.ServiceClass),
  slices: Schema.Array(FlightSliceFields),
});
export interface FlightOffer extends Schema.Schema.Type<typeof FlightOffer> {}

/** Discriminated union of all offer kinds. Today only `flight` is populated. */
export const Offer = Schema.Union(FlightOffer);
export type Offer = Schema.Schema.Type<typeof Offer>;

/**
 * A pluggable booking provider. Plugins contribute implementations via the
 * `TripCapabilities.BookingService` capability; plugin-trip resolves all of them.
 */
export interface BookingService {
  readonly id: string;
  readonly label: string;
  readonly kinds: readonly Segment.Kind[];
  search(query: SearchQuery): Promise<readonly Offer[]>;
}

/** Thrown by a `BookingService` when its credentials are not configured. */
export class MissingApiKeyError extends Error {
  constructor(public readonly serviceId: string) {
    super(`Missing API key for booking service: ${serviceId}`);
    this.name = 'MissingApiKeyError';
  }
}
```

- [ ] **Step 2: Write the failing test**

`packages/plugins/plugin-trip/src/types/BookingSearch.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { FlightOffer, FlightSearchQuery, MissingApiKeyError } from './BookingSearch';

describe('BookingSearch', () => {
  test('decodes a flight query', ({ expect }) => {
    const query = Schema.decodeUnknownSync(FlightSearchQuery)({
      _tag: 'flight',
      origin: 'JFK',
      destination: 'LHR',
      departureDate: '2026-06-01T00:00:00.000Z',
      cabinClass: 'economy',
      passengers: 1,
    });
    expect(query.origin).toBe('JFK');
    expect(query._tag).toBe('flight');
  });

  test('decodes a flight offer', ({ expect }) => {
    const offer = Schema.decodeUnknownSync(FlightOffer)({
      _tag: 'flight',
      id: 'off_123',
      provider: 'duffel',
      carrier: { name: 'Air France', iataCode: 'AF' },
      totalAmount: 540.5,
      currency: 'USD',
      cabinClass: 'economy',
      slices: [{ origin: { code: 'JFK' }, destination: { code: 'LHR' }, flightNumber: 'AF023' }],
    });
    expect(offer.slices).toHaveLength(1);
    expect(offer.totalAmount).toBe(540.5);
  });

  test('MissingApiKeyError carries the service id', ({ expect }) => {
    const error = new MissingApiKeyError('duffel');
    expect(error.serviceId).toBe('duffel');
    expect(error).toBeInstanceOf(Error);
  });
});
```

- [ ] **Step 3: Run the test**

Run: `moon run plugin-trip:test -- src/types/BookingSearch.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-trip/src/types/BookingSearch.ts packages/plugins/plugin-trip/src/types/BookingSearch.test.ts
git commit -m "feat(plugin-trip): add transient SearchQuery/Offer types + BookingService interface"
```

---

### Task 2: `BookingService` capability + type barrel

**Files:**
- Create: `packages/plugins/plugin-trip/src/types/TripCapabilities.ts`
- Modify: `packages/plugins/plugin-trip/src/types/index.ts`

- [ ] **Step 1: Write `TripCapabilities.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';
import type { BookingService as BookingServiceType } from './BookingSearch';

/**
 * Plugins contribute booking providers via this capability. Multiple plugins
 * may register; `BookingSearch` resolves all contributions and filters them by
 * the segment kind being searched.
 */
export const BookingService = Capability.make<BookingServiceType>(`${meta.id}.capability.bookingService`);
```

- [ ] **Step 2: Update the type barrel**

Modify `packages/plugins/plugin-trip/src/types/index.ts` — add these two lines after the existing exports:

```ts
export * as BookingSearch from './BookingSearch';
export * as TripCapabilities from './TripCapabilities';
```

- [ ] **Step 3: Typecheck**

Run: `moon run plugin-trip:build`
Expected: builds cleanly (no type errors).

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-trip/src/types/TripCapabilities.ts packages/plugins/plugin-trip/src/types/index.ts
git commit -m "feat(plugin-trip): define BookingService capability"
```

---

### Task 3: Pure offer → segment/booking mappers

**Files:**
- Create: `packages/plugins/plugin-trip/src/containers/BookingSearch/offer-to-segment.ts`
- Test: `packages/plugins/plugin-trip/src/containers/BookingSearch/offer-to-segment.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/plugins/plugin-trip/src/containers/BookingSearch/offer-to-segment.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type BookingSearch } from '#types';

import { offerToBookingProps, offerToFlightDetails } from './offer-to-segment';

const OFFER: BookingSearch.FlightOffer = {
  _tag: 'flight',
  id: 'off_123',
  provider: 'duffel',
  carrier: { name: 'Air France', iataCode: 'AF' },
  totalAmount: 540.5,
  currency: 'USD',
  cabinClass: 'economy',
  slices: [
    {
      origin: { code: 'JFK', name: 'New York JFK' },
      destination: { code: 'CDG', name: 'Paris CDG' },
      departAt: '2026-06-01T18:00:00.000Z',
      arriveAt: '2026-06-02T07:00:00.000Z',
      marketingCarrier: 'AF',
      flightNumber: '023',
      durationMinutes: 420,
    },
    {
      origin: { code: 'CDG' },
      destination: { code: 'LHR' },
      departAt: '2026-06-02T09:00:00.000Z',
      arriveAt: '2026-06-02T09:30:00.000Z',
      marketingCarrier: 'AF',
      flightNumber: '1680',
    },
  ],
};

describe('offer-to-segment', () => {
  test('maps offer to flight details using first and last leg', ({ expect }) => {
    const details = offerToFlightDetails(OFFER);
    expect(details._tag).toBe('flight');
    expect(details.origin?.code).toBe('JFK');
    expect(details.destination?.code).toBe('LHR');
    expect(details.departAt).toBe('2026-06-01T18:00:00.000Z');
    expect(details.arriveAt).toBe('2026-06-02T09:30:00.000Z');
    expect(details.number).toBe('AF023');
    expect(details.provider?.name).toBe('Air France');
    expect(details.serviceClass).toBe('economy');
  });

  test('maps offer to booking props with raw payload', ({ expect }) => {
    const props = offerToBookingProps(OFFER);
    expect(props.provider?.name).toBe('Air France');
    expect(props.currency).toBe('USD');
    expect(props.totalPrice).toBe(540.5);
    expect(props.source).toBe('import');
    expect(JSON.parse(props.rawPayload!).id).toBe('off_123');
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `moon run plugin-trip:test -- src/containers/BookingSearch/offer-to-segment.test.ts`
Expected: FAIL (module `./offer-to-segment` not found).

- [ ] **Step 3: Write `offer-to-segment.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import { type Obj } from '@dxos/echo';

import { type BookingSearch, type Booking, type Place, type Segment } from '#types';

/** First and last legs of an offer (used to collapse a multi-leg slice into one segment). */
const firstSlice = (offer: BookingSearch.FlightOffer) => offer.slices.at(0);
const lastSlice = (offer: BookingSearch.FlightOffer) => offer.slices.at(-1);

const toPlace = (place?: { code: string; name?: string }): Place.Place | undefined =>
  place ? { code: place.code, name: place.name } : undefined;

/**
 * Builds the `flight` `Segment.details` patch from an offer. Uses the first
 * leg's origin/departure and the last leg's destination/arrival so a multi-leg
 * offer collapses into a single segment route.
 */
export const offerToFlightDetails = (offer: BookingSearch.FlightOffer): Segment.FlightDetails => {
  const first = firstSlice(offer);
  const last = lastSlice(offer);
  const number = first?.marketingCarrier && first?.flightNumber ? `${first.marketingCarrier}${first.flightNumber}` : first?.flightNumber;
  return {
    _tag: 'flight',
    provider: { name: offer.carrier.name },
    number,
    origin: toPlace(first?.origin),
    destination: toPlace(last?.destination),
    departAt: first?.departAt,
    arriveAt: last?.arriveAt,
    serviceClass: offer.cabinClass,
  };
};

/** Builds `Booking` make-props from an offer (search-only — no real order). */
export const offerToBookingProps = (offer: BookingSearch.FlightOffer): Obj.MakeProps<typeof Booking.Booking> => ({
  provider: { name: offer.carrier.name },
  currency: offer.currency,
  totalPrice: offer.totalAmount,
  source: 'import',
  rawPayload: JSON.stringify(offer),
});
```

- [ ] **Step 4: Run the test**

Run: `moon run plugin-trip:test -- src/containers/BookingSearch/offer-to-segment.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-trip/src/containers/BookingSearch/offer-to-segment.ts packages/plugins/plugin-trip/src/containers/BookingSearch/offer-to-segment.test.ts
git commit -m "feat(plugin-trip): pure offer-to-segment/booking mappers"
```

---

### Task 4: `BookingSearch` container

**Files:**
- Create: `packages/plugins/plugin-trip/src/containers/BookingSearch/BookingSearch.tsx`
- Create: `packages/plugins/plugin-trip/src/containers/BookingSearch/index.ts`
- Modify: `packages/plugins/plugin-trip/src/containers/index.ts`

- [ ] **Step 1: Write `BookingSearch.tsx`**

```tsx
//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { Obj, Ref } from '@dxos/echo';
import { getSpace } from '@dxos/react-client/echo';
import { Button, Icon, Input, Select, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { Booking, BookingSearch as BS, Segment, TripCapabilities } from '#types';

import { offerToBookingProps, offerToFlightDetails } from './offer-to-segment';

export type BookingSearchProps = {
  segment: Segment.Segment;
};

type QueryState = {
  origin: string;
  destination: string;
  departureDate: string;
  cabinClass: Segment.ServiceClass;
  passengers: number;
};

const CABIN_OPTIONS: Segment.ServiceClass[] = ['economy', 'premium', 'business', 'first'];

export const BookingSearch = ({ segment }: BookingSearchProps) => {
  const { t } = useTranslation(meta.id);
  const kind = Segment.getKind(segment);

  // Resolve all contributed services, filtered to those that handle this kind.
  const allServices = useCapabilities(TripCapabilities.BookingService);
  const services = useMemo(() => allServices.filter((service) => service.kinds.includes(kind)), [allServices, kind]);
  const [serviceId, setServiceId] = useState<string | undefined>(undefined);
  const service = useMemo(
    () => services.find((s) => s.id === serviceId) ?? services.at(0),
    [services, serviceId],
  );

  const origin = Segment.getOrigin(segment);
  const destination = Segment.getDestination(segment);
  const [query, setQuery] = useState<QueryState>({
    origin: origin?.code ?? '',
    destination: destination?.code ?? '',
    departureDate: Segment.getDepartAt(segment) ?? '',
    cabinClass: 'economy',
    passengers: 1,
  });

  const [offers, setOffers] = useState<readonly BS.Offer[] | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const handleSearch = useCallback(async () => {
    if (!service) {
      return;
    }
    setPending(true);
    setError(undefined);
    setOffers(undefined);
    try {
      const result = await service.search({
        _tag: 'flight',
        origin: query.origin || undefined,
        destination: query.destination || undefined,
        departureDate: query.departureDate || undefined,
        cabinClass: query.cabinClass,
        passengers: query.passengers,
      });
      setOffers(result);
    } catch (err) {
      setError(err instanceof BS.MissingApiKeyError ? t('booking.missing-key.message') : t('booking.error.message'));
    } finally {
      setPending(false);
    }
  }, [service, query, t]);

  const handleSelectOffer = useCallback(
    (offer: BS.Offer) => {
      if (offer._tag !== 'flight') {
        return;
      }
      const space = getSpace(segment);
      if (!space) {
        return;
      }
      const booking = space.db.add(Booking.make(offerToBookingProps(offer)));
      const details = offerToFlightDetails(offer);
      Obj.update(segment, (seg) => {
        seg.details = details;
        seg.booking = Ref.make(booking);
      });
    },
    [segment],
  );

  if (services.length === 0) {
    return <div className='p-4 text-description'>{t('booking.no-providers.message')}</div>;
  }

  return (
    <div className='flex flex-col gap-3 p-3 overflow-y-auto'>
      {services.length > 1 && (
        <Select.Root value={service?.id} onValueChange={setServiceId}>
          <Select.TriggerButton placeholder={t('booking.provider.placeholder')} />
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                {services.map((s) => (
                  <Select.Option key={s.id} value={s.id}>
                    {s.label}
                  </Select.Option>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      )}

      <div className='grid grid-cols-2 gap-2'>
        <Input.Root>
          <Input.Label>{t('booking.origin.label')}</Input.Label>
          <Input.TextInput
            placeholder='JFK'
            value={query.origin}
            onChange={(event) => setQuery((q) => ({ ...q, origin: event.target.value.toUpperCase() }))}
          />
        </Input.Root>
        <Input.Root>
          <Input.Label>{t('booking.destination.label')}</Input.Label>
          <Input.TextInput
            placeholder='LHR'
            value={query.destination}
            onChange={(event) => setQuery((q) => ({ ...q, destination: event.target.value.toUpperCase() }))}
          />
        </Input.Root>
        <Input.Root>
          <Input.Label>{t('booking.departure.label')}</Input.Label>
          <Input.TextInput
            type='date'
            value={query.departureDate.slice(0, 10)}
            onChange={(event) =>
              setQuery((q) => ({ ...q, departureDate: event.target.value ? new Date(event.target.value).toISOString() : '' }))
            }
          />
        </Input.Root>
        <Input.Root>
          <Input.Label>{t('booking.passengers.label')}</Input.Label>
          <Input.TextInput
            type='number'
            value={String(query.passengers)}
            onChange={(event) => setQuery((q) => ({ ...q, passengers: Math.max(1, Number(event.target.value) || 1) }))}
          />
        </Input.Root>
      </div>

      <Select.Root
        value={query.cabinClass}
        onValueChange={(value) => setQuery((q) => ({ ...q, cabinClass: value as Segment.ServiceClass }))}
      >
        <Select.TriggerButton placeholder={t('booking.cabin.placeholder')} />
        <Select.Portal>
          <Select.Content>
            <Select.Viewport>
              {CABIN_OPTIONS.map((value) => (
                <Select.Option key={value} value={value}>
                  {value}
                </Select.Option>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>

      <Button variant='primary' disabled={pending || !service} onClick={() => void handleSearch()}>
        {pending ? t('booking.searching.label') : t('booking.search.label')}
      </Button>

      {error && <div className='text-error'>{error}</div>}
      {offers && offers.length === 0 && <div className='text-description'>{t('booking.no-offers.message')}</div>}

      <div className='flex flex-col gap-2'>
        {offers?.map((offer) =>
          offer._tag === 'flight' ? (
            <button
              key={offer.id}
              className='flex items-center justify-between rounded border border-separator p-2 text-start hover:bg-hoverSurface'
              onClick={() => handleSelectOffer(offer)}
            >
              <span className='flex items-center gap-2'>
                <Icon icon='ph--airplane--regular' size={4} />
                <span>{offer.carrier.name}</span>
                <span className='text-description'>
                  {offer.slices.at(0)?.origin.code} → {offer.slices.at(-1)?.destination.code}
                </span>
              </span>
              <span className='font-mono'>
                {offer.totalAmount} {offer.currency}
              </span>
            </button>
          ) : null,
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Write `index.ts`**

`packages/plugins/plugin-trip/src/containers/BookingSearch/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export * from './BookingSearch';
```

- [ ] **Step 3: Export from the containers barrel**

Modify `packages/plugins/plugin-trip/src/containers/index.ts` — add (keep alphabetical with existing `SegmentArticle`/`TripArticle` exports):

```ts
export * from './BookingSearch';
```

- [ ] **Step 4: Build**

Run: `moon run plugin-trip:build`
Expected: builds cleanly. (If `Button`/`Icon`/`Input` import names differ, fix against `@dxos/react-ui` exports — see TripArticle.tsx for `Select`/`Toolbar` usage.)

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-trip/src/containers/BookingSearch packages/plugins/plugin-trip/src/containers/index.ts
git commit -m "feat(plugin-trip): BookingSearch container"
```

---

### Task 5: SegmentArticle toolbar Form ⇄ Search toggle

**Files:**
- Modify: `packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx`

- [ ] **Step 1: Replace `SegmentArticle.tsx` with the toggled version**

```tsx
//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Type } from '@dxos/echo';
import { type JsonPath, splitJsonPath } from '@dxos/effect';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { Form, omitId } from '@dxos/react-ui-form';

import { BookingSearch } from '#containers';
import { meta } from '#meta';
import { Segment, Trip } from '#types';

type ViewMode = 'form' | 'search';

/**
 * Companion surface for a selected Segment. A toolbar toggles between the
 * schema-driven edit Form and the BookingSearch surface. Defaults to Search
 * when the segment has no booking yet, otherwise Form. The user can switch
 * either way — the toolbar drives the view, it is not a hard conditional.
 */
export type SegmentArticleProps = AppSurface.ArticleProps<Segment.Segment, {}, Trip.Trip>;

export const SegmentArticle = ({ role, subject: segment }: SegmentArticleProps) => {
  const { t } = useTranslation(meta.id);
  const type = Obj.getType(segment);
  const echoSchema = type && Type.getSchema(type);
  const schema = useMemo(() => echoSchema && omitId(echoSchema), [echoSchema]);
  const [viewMode, setViewMode] = useState<ViewMode>(segment.booking ? 'form' : 'search');

  const handleSave = useCallback(
    (values: Record<string, unknown>, { changed }: { changed: Record<string, boolean> }) => {
      const paths = Object.keys(changed).filter((path) => changed[path]);
      Obj.update(segment, () => {
        for (const path of paths) {
          const parts = splitJsonPath(path as JsonPath);
          const value = Obj.getValue(values as any, parts);
          Obj.setValue(segment, parts, value);
        }
      });
    },
    [segment],
  );

  if (!schema) {
    return null;
  }

  return (
    <Panel.Root role={role} className='dx-document'>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <div className='grow' />
          <Toolbar.ToggleGroup
            type='single'
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as ViewMode)}
          >
            <Toolbar.ToggleGroupIconItem
              value='form'
              icon='ph--list-bullets--regular'
              iconOnly
              label={t('segment.view.form.label')}
            />
            <Toolbar.ToggleGroupIconItem
              value='search'
              icon='ph--magnifying-glass--regular'
              iconOnly
              label={t('segment.view.search.label')}
            />
          </Toolbar.ToggleGroup>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        {viewMode === 'search' ? (
          <BookingSearch segment={segment} />
        ) : (
          <Form.Root key={segment.id} schema={schema} defaultValues={segment} autoSave onSave={handleSave}>
            <Form.Viewport>
              <Form.Content>
                <Form.FieldSet />
              </Form.Content>
            </Form.Viewport>
          </Form.Root>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};
```

- [ ] **Step 2: Build**

Run: `moon run plugin-trip:build`
Expected: builds cleanly.

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx
git commit -m "feat(plugin-trip): SegmentArticle Form/Search toolbar toggle"
```

---

### Task 6: plugin-trip translations

**Files:**
- Modify: `packages/plugins/plugin-trip/src/translations.ts`

- [ ] **Step 1: Add keys under `[meta.id]`**

In `packages/plugins/plugin-trip/src/translations.ts`, add these entries to the existing `[meta.id]` object (after `'segment.depart.placeholder'`):

```ts
        'segment.view.form.label': 'Details',
        'segment.view.search.label': 'Search',
        'booking.search.label': 'Search',
        'booking.searching.label': 'Searching…',
        'booking.provider.placeholder': 'Select provider',
        'booking.origin.label': 'Origin',
        'booking.destination.label': 'Destination',
        'booking.departure.label': 'Departure',
        'booking.passengers.label': 'Passengers',
        'booking.cabin.placeholder': 'Cabin class',
        'booking.no-providers.message': 'No booking providers are enabled. Enable a booking plugin (e.g. Duffel) in settings.',
        'booking.no-offers.message': 'No offers found.',
        'booking.missing-key.message': 'Set the provider API key in plugin settings to search.',
        'booking.error.message': 'Search failed. Check the provider configuration and try again.',
```

- [ ] **Step 2: Build**

Run: `moon run plugin-trip:build`
Expected: builds cleanly.

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/plugin-trip/src/translations.ts
git commit -m "feat(plugin-trip): booking-search translations"
```

---

### Task 7: BookingSearch storybook

**Files:**
- Create: `packages/plugins/plugin-trip/src/containers/BookingSearch/BookingSearch.stories.tsx`

- [ ] **Step 1: Write the storybook**

Use the existing `SegmentArticle.stories.tsx` / `TripArticle.stories.tsx` in this package as the reference for the decorator setup (space + theme). Provide a stub `BookingService` via the capability so no network is hit.

```tsx
//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { BookingSearch } from './BookingSearch';
import { Segment } from '#types';

// NOTE: A real story must register a stub `TripCapabilities.BookingService`
// (id 'stub', kinds ['flight'], search returning fixture offers) through the
// same plugin/surface harness used by SegmentArticle.stories.tsx so that
// `useCapabilities(TripCapabilities.BookingService)` resolves. Mirror the
// decorator stack (withPluginManager / withTheme) from the sibling stories.

const meta: Meta<typeof BookingSearch> = {
  title: 'plugins/plugin-trip/BookingSearch',
  component: BookingSearch,
  decorators: [withTheme],
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof BookingSearch>;

export const Default: Story = {
  args: {
    segment: Segment.makeDefault('flight'),
  },
};
```

> If the sibling stories use a richer decorator (e.g. `withPluginManager` to supply capabilities), copy that decorator and register the stub service so the picker/results render. Match whatever pattern `SegmentArticle.stories.tsx` already uses.

- [ ] **Step 2: Serve storybook and verify visually**

Run: `moon run storybook-react:serve` (port 9009), open the `plugins/plugin-trip/BookingSearch` story.
Expected: the query form renders (origin/destination/date/passengers/cabin + Search button). With the stub service registered, clicking Search lists fixture offers; the "no providers" message shows when no service is registered.

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/plugin-trip/src/containers/BookingSearch/BookingSearch.stories.tsx
git commit -m "test(plugin-trip): BookingSearch storybook"
```

---

## PART B — plugin-duffel: new package

### Task 8: Scaffold the package

**Files:**
- Create: `packages/plugins/plugin-duffel/package.json`
- Create: `packages/plugins/plugin-duffel/tsconfig.json`
- Create: `packages/plugins/plugin-duffel/moon.yml`
- Create: `packages/plugins/plugin-duffel/src/meta.ts`
- Create: `packages/plugins/plugin-duffel/src/index.ts`

- [ ] **Step 1: `package.json`**

```json
{
  "name": "@dxos/plugin-duffel",
  "version": "0.8.3",
  "private": true,
  "description": "Duffel flight-booking provider for Composer.",
  "homepage": "https://dxos.org",
  "bugs": "https://github.com/dxos/dxos/issues",
  "repository": {
    "type": "git",
    "url": "https://github.com/dxos/dxos"
  },
  "license": "FSL-1.1-Apache-2.0",
  "author": "DXOS.org",
  "sideEffects": true,
  "type": "module",
  "imports": {
    "#capabilities": {
      "source": "./src/capabilities/index.ts",
      "types": "./dist/types/src/capabilities/index.d.ts",
      "default": "./dist/lib/neutral/capabilities/index.mjs"
    },
    "#containers": {
      "source": "./src/containers/index.ts",
      "types": "./dist/types/src/containers/index.d.ts",
      "default": "./dist/lib/neutral/containers/index.mjs"
    },
    "#meta": {
      "source": "./src/meta.ts",
      "types": "./dist/types/src/meta.d.ts",
      "default": "./dist/lib/neutral/meta.mjs"
    },
    "#plugin": {
      "source": "./src/DuffelPlugin.tsx",
      "types": "./dist/types/src/DuffelPlugin.d.ts",
      "default": "./dist/lib/neutral/DuffelPlugin.mjs"
    },
    "#services": {
      "source": "./src/services/index.ts",
      "types": "./dist/types/src/services/index.d.ts",
      "default": "./dist/lib/neutral/services/index.mjs"
    },
    "#translations": {
      "source": "./src/translations.ts",
      "types": "./dist/types/src/translations.d.ts",
      "default": "./dist/lib/neutral/translations.mjs"
    },
    "#types": {
      "source": "./src/types/index.ts",
      "types": "./dist/types/src/types/index.d.ts",
      "default": "./dist/lib/neutral/types/index.mjs"
    }
  },
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "types": "./dist/types/src/index.d.ts",
      "default": "./dist/lib/neutral/index.mjs"
    },
    "./plugin": {
      "source": "./src/plugin.ts",
      "types": "./dist/types/src/plugin.d.ts",
      "default": "./dist/lib/neutral/plugin.mjs"
    }
  },
  "types": "dist/types/src/index.d.ts",
  "files": [
    "dist",
    "src"
  ],
  "dependencies": {
    "@dxos/app-framework": "workspace:*",
    "@dxos/app-toolkit": "workspace:*",
    "@dxos/echo": "workspace:*",
    "@dxos/edge-client": "workspace:*",
    "@dxos/effect": "workspace:*",
    "@dxos/log": "workspace:*",
    "@dxos/plugin-trip": "workspace:*",
    "@dxos/react-ui": "workspace:*",
    "@dxos/react-ui-form": "workspace:*",
    "@dxos/types": "workspace:*",
    "@dxos/util": "workspace:*",
    "@effect-atom/atom-react": "catalog:",
    "effect": "catalog:"
  },
  "devDependencies": {
    "@dxos/plugin-client": "workspace:*",
    "@dxos/plugin-testing": "workspace:*",
    "@dxos/plugin-theme": "workspace:*",
    "@dxos/storybook-utils": "workspace:*",
    "@types/react": "catalog:",
    "@types/react-dom": "catalog:",
    "react": "catalog:",
    "react-dom": "catalog:",
    "vite": "catalog:"
  },
  "peerDependencies": {
    "@dxos/react-ui": "workspace:*",
    "react": "catalog:",
    "react-dom": "catalog:"
  }
}
```

- [ ] **Step 2: `tsconfig.json`** (project references resolved relative to `packages/plugins/plugin-duffel`)

```json
{
  "extends": [
    "../../../tsconfig.base.json"
  ],
  "compilerOptions": {
    "types": [
      "node"
    ]
  },
  "exclude": [
    "*.t.ts",
    "vite.config.ts"
  ],
  "include": [
    "src/**/*.ts",
    "src/**/*.tsx",
    "src/*.ts"
  ],
  "references": [
    { "path": "../../common/effect" },
    { "path": "../../common/log" },
    { "path": "../../common/util" },
    { "path": "../../core/echo/echo" },
    { "path": "../../core/mesh/edge-client" },
    { "path": "../../sdk/app-framework" },
    { "path": "../../sdk/app-toolkit" },
    { "path": "../../sdk/types" },
    { "path": "../../ui/react-ui" },
    { "path": "../../ui/react-ui-form" },
    { "path": "../plugin-client" },
    { "path": "../plugin-testing" },
    { "path": "../plugin-theme" },
    { "path": "../plugin-trip" }
  ]
}
```

> If `moon run plugin-duffel:build` reports a missing/extra reference, align this list to the actual import graph (each `@dxos/*` dep needs a matching `references` path). Verify edge-client's path is `../../core/mesh/edge-client` by checking `ls packages/core/mesh/edge-client/tsconfig.json`.

- [ ] **Step 3: `moon.yml`**

```yaml
layer: library
language: typescript
tags:
  - ts-build
  - ts-test
  - pack
tasks:
  compile:
    args:
      - '--entryPoint=src/index.ts'
      - '--entryPoint=src/DuffelPlugin.tsx'
      - '--entryPoint=src/capabilities/index.ts'
      - '--entryPoint=src/containers/index.ts'
      - '--entryPoint=src/meta.ts'
      - '--entryPoint=src/plugin.ts'
      - '--entryPoint=src/services/index.ts'
      - '--entryPoint=src/translations.ts'
      - '--entryPoint=src/types/index.ts'
      - '--platform=neutral'
```

- [ ] **Step 4: `src/meta.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.duffel',
  name: 'Duffel',
  author: 'DXOS',
  description: trim`
    Duffel contributes a flight-search booking provider to Composer. It
    implements the plugin-trip BookingService capability by mapping a simplified
    flight query onto the Duffel REST API (POST /air/offer_requests) and
    returning offers, which the Trip plugin renders inline on a segment. Requests
    are routed through the DXOS edge CORS proxy and authenticated with an API key
    stored in local plugin settings. This first cut is search-only: selecting an
    offer fills the segment and records a local Booking, but no order is placed.
  `,
  icon: 'ph--airplane-tilt--regular',
  iconHue: 'indigo',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-duffel',
  version: '0.8.3',
  tags: ['labs'],
};
```

- [ ] **Step 5: `src/index.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

export * from './meta';
export * from './types';
```

- [ ] **Step 6: Install workspace links**

Run: `CI=true pnpm install`
Expected: links `@dxos/plugin-duffel`; no errors. (`@dxos/plugin-trip` and `@dxos/edge-client` resolve as workspace deps.)

- [ ] **Step 7: Commit**

```bash
git add packages/plugins/plugin-duffel/package.json packages/plugins/plugin-duffel/tsconfig.json packages/plugins/plugin-duffel/moon.yml packages/plugins/plugin-duffel/src/meta.ts packages/plugins/plugin-duffel/src/index.ts pnpm-lock.yaml
git commit -m "feat(plugin-duffel): scaffold package"
```

---

### Task 9: Settings schema + capability types

**Files:**
- Create: `packages/plugins/plugin-duffel/src/types/Settings.ts`
- Create: `packages/plugins/plugin-duffel/src/types/DuffelCapabilities.ts`
- Create: `packages/plugins/plugin-duffel/src/types/index.ts`

- [ ] **Step 1: `Settings.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const Settings = Schema.mutable(
  Schema.Struct({
    apiKey: Schema.optional(
      Schema.String.annotations({
        title: 'API key',
        description: 'Duffel API access token (test or live).',
      }),
    ),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
```

- [ ] **Step 2: `DuffelCapabilities.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

export const Settings = Capability.make<Atom.Writable<import('./Settings').Settings>>(
  `${meta.id}.capability.settings`,
);
```

- [ ] **Step 3: `types/index.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

export * as DuffelCapabilities from './DuffelCapabilities';
export * as Settings from './Settings';
```

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-duffel/src/types
git commit -m "feat(plugin-duffel): settings schema + capability types"
```

---

### Task 10: Duffel request/response mapping (pure, TDD)

**Files:**
- Create: `packages/plugins/plugin-duffel/src/services/duffel-mapping.ts`
- Test: `packages/plugins/plugin-duffel/src/services/duffel-mapping.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/plugins/plugin-duffel/src/services/duffel-mapping.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type BookingSearch } from '@dxos/plugin-trip';

import { offerRequestBody, parseOffers } from './duffel-mapping';

const QUERY: BookingSearch.FlightSearchQuery = {
  _tag: 'flight',
  origin: 'JFK',
  destination: 'LHR',
  departureDate: '2026-06-01T18:00:00.000Z',
  returnDate: undefined,
  cabinClass: 'premium',
  passengers: 2,
};

const DUFFEL_RESPONSE = {
  data: {
    offers: [
      {
        id: 'off_123',
        total_amount: '540.50',
        total_currency: 'USD',
        owner: { name: 'Air France', iata_code: 'AF' },
        slices: [
          {
            segments: [
              {
                origin: { iata_code: 'JFK', name: 'New York JFK' },
                destination: { iata_code: 'LHR', name: 'London Heathrow' },
                departing_at: '2026-06-01T18:00:00',
                arriving_at: '2026-06-02T06:00:00',
                marketing_carrier: { iata_code: 'AF' },
                marketing_carrier_flight_number: '023',
                duration: 'PT7H30M',
              },
            ],
          },
        ],
      },
    ],
  },
};

describe('duffel-mapping', () => {
  test('builds an offer-request body, mapping premium -> premium_economy and a date-only departure', ({ expect }) => {
    const body = offerRequestBody(QUERY);
    expect(body.data.slices).toEqual([{ origin: 'JFK', destination: 'LHR', departure_date: '2026-06-01' }]);
    expect(body.data.passengers).toEqual([{ type: 'adult' }, { type: 'adult' }]);
    expect(body.data.cabin_class).toBe('premium_economy');
  });

  test('parses Duffel offers into FlightOffer[]', ({ expect }) => {
    const offers = parseOffers(DUFFEL_RESPONSE);
    expect(offers).toHaveLength(1);
    const offer = offers[0];
    expect(offer._tag).toBe('flight');
    expect(offer.id).toBe('off_123');
    expect(offer.provider).toBe('duffel');
    expect(offer.carrier).toEqual({ name: 'Air France', iataCode: 'AF' });
    expect(offer.totalAmount).toBe(540.5);
    expect(offer.currency).toBe('USD');
    expect(offer.slices).toHaveLength(1);
    expect(offer.slices[0]).toMatchObject({
      origin: { code: 'JFK', name: 'New York JFK' },
      destination: { code: 'LHR', name: 'London Heathrow' },
      marketingCarrier: 'AF',
      flightNumber: '023',
      durationMinutes: 450,
    });
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `moon run plugin-duffel:test -- src/services/duffel-mapping.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `duffel-mapping.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import { type BookingSearch, type Segment } from '@dxos/plugin-trip';

/** Duffel cabin_class values. */
type DuffelCabin = 'economy' | 'premium_economy' | 'business' | 'first';

const CABIN_MAP: Record<Segment.ServiceClass, DuffelCabin> = {
  economy: 'economy',
  premium: 'premium_economy',
  business: 'business',
  first: 'first',
};

export type DuffelOfferRequestBody = {
  data: {
    slices: Array<{ origin: string; destination: string; departure_date: string }>;
    passengers: Array<{ type: 'adult' }>;
    cabin_class?: DuffelCabin;
  };
};

/** Date-only (YYYY-MM-DD) component of an ISO datetime, as Duffel requires. */
const toDateOnly = (iso?: string): string => (iso ? iso.slice(0, 10) : '');

/** Maps a simplified FlightSearchQuery onto a Duffel offer-request body. */
export const offerRequestBody = (query: BookingSearch.FlightSearchQuery): DuffelOfferRequestBody => {
  const slices: DuffelOfferRequestBody['data']['slices'] = [];
  if (query.origin && query.destination && query.departureDate) {
    slices.push({ origin: query.origin, destination: query.destination, departure_date: toDateOnly(query.departureDate) });
    if (query.returnDate) {
      slices.push({ origin: query.destination, destination: query.origin, departure_date: toDateOnly(query.returnDate) });
    }
  }
  const count = Math.max(1, query.passengers ?? 1);
  return {
    data: {
      slices,
      passengers: Array.from({ length: count }, () => ({ type: 'adult' as const })),
      cabin_class: query.cabinClass ? CABIN_MAP[query.cabinClass] : undefined,
    },
  };
};

const CABIN_REVERSE: Record<DuffelCabin, Segment.ServiceClass> = {
  economy: 'economy',
  premium_economy: 'premium',
  business: 'business',
  first: 'first',
};

/** Parses an ISO-8601 duration like `PT7H30M` to minutes. */
const parseDurationMinutes = (duration?: string): number | undefined => {
  if (!duration) {
    return undefined;
  }
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(duration);
  if (!match) {
    return undefined;
  }
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  return hours * 60 + minutes;
};

// Minimal structural views of the Duffel response (only fields we consume).
type DuffelSegment = {
  origin?: { iata_code?: string; name?: string };
  destination?: { iata_code?: string; name?: string };
  departing_at?: string;
  arriving_at?: string;
  marketing_carrier?: { iata_code?: string };
  marketing_carrier_flight_number?: string;
  duration?: string;
};
type DuffelOffer = {
  id: string;
  total_amount: string;
  total_currency: string;
  owner?: { name?: string; iata_code?: string };
  slices?: Array<{ segments?: DuffelSegment[] }>;
  cabin_class?: DuffelCabin;
};
type DuffelOffersResponse = { data?: { offers?: DuffelOffer[] } };

const toSlice = (segment: DuffelSegment): BookingSearch.FlightSliceFields => ({
  origin: { code: segment.origin?.iata_code ?? '', name: segment.origin?.name },
  destination: { code: segment.destination?.iata_code ?? '', name: segment.destination?.name },
  departAt: segment.departing_at,
  arriveAt: segment.arriving_at,
  marketingCarrier: segment.marketing_carrier?.iata_code,
  flightNumber: segment.marketing_carrier_flight_number,
  durationMinutes: parseDurationMinutes(segment.duration),
});

/** Maps a Duffel offers response into the transient FlightOffer[] shape. */
export const parseOffers = (response: DuffelOffersResponse): BookingSearch.FlightOffer[] =>
  (response.data?.offers ?? []).map((offer) => ({
    _tag: 'flight' as const,
    id: offer.id,
    provider: 'duffel',
    carrier: { name: offer.owner?.name ?? 'Unknown', iataCode: offer.owner?.iata_code },
    totalAmount: Number(offer.total_amount),
    currency: offer.total_currency,
    cabinClass: offer.cabin_class ? CABIN_REVERSE[offer.cabin_class] : undefined,
    slices: (offer.slices ?? []).flatMap((slice) => (slice.segments ?? []).map(toSlice)),
  }));
```

- [ ] **Step 4: Run the test**

Run: `moon run plugin-duffel:test -- src/services/duffel-mapping.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-duffel/src/services/duffel-mapping.ts packages/plugins/plugin-duffel/src/services/duffel-mapping.test.ts
git commit -m "feat(plugin-duffel): Duffel request/response mapping"
```

---

### Task 11: DuffelClient (thin REST via CORS proxy)

**Files:**
- Create: `packages/plugins/plugin-duffel/src/services/DuffelClient.ts`

- [ ] **Step 1: Write `DuffelClient.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import { proxyFetchLegacy } from '@dxos/edge-client';
import { log } from '@dxos/log';

import { type DuffelOfferRequestBody } from './duffel-mapping';

const DUFFEL_API = 'https://api.duffel.com';
const DUFFEL_VERSION = 'v2';

/**
 * Minimal Duffel REST client. Routes through the DXOS edge CORS proxy
 * (`proxyFetchLegacy` moves `Authorization` to `X-Cors-Proxy-Authorization`),
 * because `api.duffel.com` does not permit browser CORS. Only the search path
 * (create offer request, return offers inline) is implemented.
 */
export const createOfferRequest = async (apiKey: string, body: DuffelOfferRequestBody): Promise<unknown> => {
  const target = new URL('/air/offer_requests?return_offers=true', DUFFEL_API);
  const response = await proxyFetchLegacy(target, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Duffel-Version': DUFFEL_VERSION,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    log.warn('duffel offer request failed', { status: response.status, text });
    throw new Error(`Duffel request failed: ${response.status}`);
  }

  return response.json();
};
```

- [ ] **Step 2: Build**

Run: `moon run plugin-duffel:build`
Expected: builds cleanly (confirms `proxyFetchLegacy` import resolves from `@dxos/edge-client`).

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/plugin-duffel/src/services/DuffelClient.ts
git commit -m "feat(plugin-duffel): Duffel REST client via CORS proxy"
```

---

### Task 12: DuffelBookingService factory + services barrel

**Files:**
- Create: `packages/plugins/plugin-duffel/src/services/DuffelBookingService.ts`
- Create: `packages/plugins/plugin-duffel/src/services/index.ts`

- [ ] **Step 1: Write `DuffelBookingService.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import { type BookingSearch, MissingApiKeyError } from '@dxos/plugin-trip';

import { createOfferRequest } from './DuffelClient';
import { offerRequestBody, parseOffers } from './duffel-mapping';

export const DUFFEL_SERVICE_ID = 'duffel';

/**
 * Builds the BookingService implementation. Takes a `getApiKey` accessor (the
 * capability module wires it to the live settings atom) so the current key is
 * read at search time and the factory stays unit-testable.
 */
export const makeDuffelBookingService = (getApiKey: () => string | undefined): BookingSearch.BookingService => ({
  id: DUFFEL_SERVICE_ID,
  label: 'Duffel',
  kinds: ['flight'],
  search: async (query) => {
    if (query._tag !== 'flight') {
      return [];
    }
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new MissingApiKeyError(DUFFEL_SERVICE_ID);
    }
    const response = await createOfferRequest(apiKey, offerRequestBody(query));
    return parseOffers(response as Parameters<typeof parseOffers>[0]);
  },
});
```

- [ ] **Step 2: Write `services/index.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

export * from './DuffelBookingService';
export * from './DuffelClient';
export * from './duffel-mapping';
```

- [ ] **Step 3: Build**

Run: `moon run plugin-duffel:build`
Expected: builds cleanly.

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-duffel/src/services/DuffelBookingService.ts packages/plugins/plugin-duffel/src/services/index.ts
git commit -m "feat(plugin-duffel): BookingService implementation"
```

---

### Task 13: Settings panel container

**Files:**
- Create: `packages/plugins/plugin-duffel/src/containers/DuffelSettings/DuffelSettings.tsx`
- Create: `packages/plugins/plugin-duffel/src/containers/DuffelSettings/index.ts`
- Create: `packages/plugins/plugin-duffel/src/containers/index.ts`

- [ ] **Step 1: `DuffelSettings.tsx`** (mirrors plugin-generator's `GeneratorSettings`)

```tsx
//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Settings } from '#types';

export type DuffelSettingsProps = AppSurface.SettingsArticleProps<Settings.Settings>;

export const DuffelSettings = ({ settings, onSettingsChange }: DuffelSettingsProps) => {
  const { t } = useTranslation(meta.id);
  return (
    <SettingsForm.Viewport>
      <SettingsForm.Section title={t('plugin.name')}>
        <SettingsForm.FieldSet
          readonly={!onSettingsChange}
          schema={Settings.Settings}
          values={settings}
          onValuesChanged={(values) => onSettingsChange?.(() => values)}
        />
      </SettingsForm.Section>
    </SettingsForm.Viewport>
  );
};

export default DuffelSettings;
```

- [ ] **Step 2: `DuffelSettings/index.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

export * from './DuffelSettings';
```

- [ ] **Step 3: `containers/index.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

export * from './DuffelSettings';
```

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-duffel/src/containers
git commit -m "feat(plugin-duffel): settings panel container"
```

---

### Task 14: Capabilities — settings atom + AppCapabilities.Settings + BookingService

**Files:**
- Create: `packages/plugins/plugin-duffel/src/capabilities/duffel.ts`
- Create: `packages/plugins/plugin-duffel/src/capabilities/react-surface.tsx`
- Create: `packages/plugins/plugin-duffel/src/capabilities/index.ts`

- [ ] **Step 1: `capabilities/duffel.ts`** — single module so settings + booking service share one atom and avoid activation-ordering races (pattern from `plugin-meeting/src/capabilities/state.ts`)

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { createKvsStore } from '@dxos/effect';
import { TripCapabilities } from '@dxos/plugin-trip';

import { makeDuffelBookingService } from '#services';
import { meta } from '#meta';
import { DuffelCapabilities, Settings } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const settingsAtom = createKvsStore({
      key: meta.id,
      schema: Settings.Settings,
      defaultValue: () => ({ apiKey: undefined }),
    });

    const service = makeDuffelBookingService(() => registry.get(settingsAtom).apiKey);

    return [
      Capability.contributes(DuffelCapabilities.Settings, settingsAtom),
      Capability.contributes(AppCapabilities.Settings, {
        prefix: meta.id,
        schema: Settings.Settings,
        atom: settingsAtom,
      }),
      Capability.contributes(TripCapabilities.BookingService, service),
    ];
  }),
);
```

- [ ] **Step 2: `capabilities/react-surface.tsx`** — settings panel surface (mirrors plugin-generator)

```tsx
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { DuffelSettings } from '#containers';
import { meta } from '#meta';
import { type Settings } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'plugin-settings',
        filter: AppSurface.settings(AppSurface.Article, meta.id),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          return <DuffelSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
    ]),
  ),
);
```

- [ ] **Step 3: `capabilities/index.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const Duffel = Capability.lazy('Duffel', () => import('./duffel'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
```

- [ ] **Step 4: Build**

Run: `moon run plugin-duffel:build`
Expected: builds cleanly.

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-duffel/src/capabilities
git commit -m "feat(plugin-duffel): settings + BookingService capabilities"
```

---

### Task 15: Translations + plugin definition + lazy wrapper

**Files:**
- Create: `packages/plugins/plugin-duffel/src/translations.ts`
- Create: `packages/plugins/plugin-duffel/src/plugin.ts`
- Create: `packages/plugins/plugin-duffel/src/DuffelPlugin.tsx`

- [ ] **Step 1: `translations.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin.name': 'Duffel',
        'api-key.label': 'API key',
      },
    },
  },
] as const satisfies Resource[];
```

- [ ] **Step 2: `plugin.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const DuffelPlugin = Plugin.lazy(meta, () => import('#plugin'));
```

- [ ] **Step 3: `DuffelPlugin.tsx`**

```tsx
//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { Duffel, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const DuffelPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: `${meta.id}/duffel`,
    activatesOn: ActivationEvents.Startup,
    activate: Duffel,
  }),
  Plugin.make,
);

export default DuffelPlugin;
```

> Verify `Plugin.addModule({ activate })` accepts a lazy capability (`Capability.lazy`) the same way `AppPlugin.add*Module` does. If it requires an inline `activate: () => Effect...`, replace the module with `AppPlugin.addModule(...)` or inline `activate: () => import('./capabilities/duffel').then((m) => m.default(...))` following whatever `TripPlugin.tsx`'s `trip-extractor` module shape supports. The `trip-extractor` module in `TripPlugin.tsx` uses `activate: () => Effect.succeed(Capability.contributes(...))`; for a lazy module-with-dependencies prefer wiring it through a dedicated `AppPlugin.add*Module` helper if one exists, mirroring how `plugin-meeting` registers its `state` capability module.

- [ ] **Step 4: Build**

Run: `moon run plugin-duffel:build`
Expected: builds cleanly.

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-duffel/src/translations.ts packages/plugins/plugin-duffel/src/plugin.ts packages/plugins/plugin-duffel/src/DuffelPlugin.tsx
git commit -m "feat(plugin-duffel): plugin definition + translations"
```

---

## PART C — App integration

### Task 16: Register plugin-duffel in composer-app

**Files:**
- Modify: `packages/apps/composer-app/package.json`
- Modify: `packages/apps/composer-app/tsconfig.json`
- Modify: `packages/apps/composer-app/src/plugin-defs.tsx`

- [ ] **Step 1: Add the dependency**

In `packages/apps/composer-app/package.json`, add to `dependencies` (alphabetical, before `@dxos/plugin-file`):

```json
    "@dxos/plugin-duffel": "workspace:*",
```

- [ ] **Step 2: Add the project reference**

In `packages/apps/composer-app/tsconfig.json` `references`, add (near the other `../../plugins/plugin-*` entries):

```json
      { "path": "../../plugins/plugin-duffel" },
```

(Match the exact object formatting used by the surrounding entries in that file.)

- [ ] **Step 3: Import the plugin**

In `packages/apps/composer-app/src/plugin-defs.tsx`, add the import next to the other `D`/`F` plugin imports (alphabetical — before `FilePlugin`):

```ts
import { DuffelPlugin } from '@dxos/plugin-duffel/plugin';
```

- [ ] **Step 4: List the meta id (labs/default-off list)**

In the meta-id array that contains `ProductSearchPlugin.meta.id` (~line 143), add (alphabetical):

```ts
      DuffelPlugin.meta.id,
```

- [ ] **Step 5: Register the instance**

In the plugin-instances array that contains `TripPlugin()` (~line 265), add (alphabetical — before `FilePlugin()` / near `GeneratorPlugin()`):

```ts
    DuffelPlugin(),
```

- [ ] **Step 6: Install + build the app graph**

Run: `CI=true pnpm install`
Then: `moon run composer-app:build`
Expected: installs and builds cleanly.

- [ ] **Step 7: Commit**

```bash
git add packages/apps/composer-app/package.json packages/apps/composer-app/tsconfig.json packages/apps/composer-app/src/plugin-defs.tsx pnpm-lock.yaml
git commit -m "feat(composer-app): register plugin-duffel"
```

---

### Task 17: End-to-end verification

- [ ] **Step 1: Full test of both packages**

Run: `moon run plugin-trip:test` and `moon run plugin-duffel:test`
Expected: all PASS.

- [ ] **Step 2: Lint**

Run: `moon run plugin-trip:lint -- --fix` and `moon run plugin-duffel:lint -- --fix`
Expected: clean.

- [ ] **Step 3: Cast audit (CLAUDE.md gate)**

Run: `git diff origin/main | grep -nE '\bas (any|unknown|const|[A-Z])|as unknown as'`
Expected: only the justified `as` casts present in this plan (`event.target.value as Segment.ServiceClass` in BookingSearch's cabin select, `value as ViewMode` in the toggles, `values as any` carried over verbatim from the original SegmentArticle save handler, and `response as Parameters<typeof parseOffers>[0]` at the untyped Duffel JSON boundary). Confirm each is at a genuine type boundary; remove any others.

- [ ] **Step 4: Manual app smoke test**

Run: `moon run composer-app:serve --quiet` (port 5173).
1. Open Settings → Duffel → paste the test API key `<your Duffel test key — set in Settings, do not commit>`.
2. Create a Trip, add a flight segment, open the segment companion.
3. Toolbar defaults to **Search** (no booking yet). Enter origin `JFK`, destination `LHR`, a near-future date, and Search.
4. Expected: offers list (live Duffel test data via the proxy). Selecting one fills the flight details, creates a Booking, and the toolbar can switch to **Form** to show the populated fields.
5. If the proxy/key is unavailable, confirm the missing-key / error message renders instead of crashing.

> This step needs the dev server + network; if running headless, rely on Tasks 1–15 unit/storybook checks and note the live step as pending.

- [ ] **Step 5: Final commit (if lint/fix changed files)**

```bash
git add -A
git commit -m "chore: lint fixes for booking services"
```

---

## Self-Review Notes

- **Spec coverage:** BookingService capability (Tasks 1–2) ✓; generalized SearchQuery/Offer mixin+tagged union (Task 1) ✓; BookingSearch component + provider picker + offer-select write (Tasks 3–4) ✓; SegmentArticle Form⇄Search toolbar toggle (Task 5) ✓; plugin-duffel settings panel only-UI (Tasks 9, 13, 14) ✓; thin REST client via CORS proxy (Task 11) ✓; search-only, no order (Task 12) ✓; no app-graph change (untouched) ✓; tests for mapping + offer→segment + storybook (Tasks 3, 7, 10) ✓.
- **Type consistency:** `offerToFlightDetails`/`offerToBookingProps` (Task 3) match BookingSearch types (Task 1); `offerRequestBody`/`parseOffers` (Task 10) feed `makeDuffelBookingService` (Task 12); `DuffelOfferRequestBody` shared between mapping and client (Tasks 10–11); `MissingApiKeyError` defined in Task 1, thrown in Task 12, caught in Task 4.
- **Known risk flags (called out inline):** exact `@dxos/react-ui` import names for `Button`/`Icon`/`Input` (Task 4 Step 4); tsconfig reference list correctness (Task 8 Step 2); `Plugin.addModule` accepting a lazy capability module with a dependency (Task 15 Step 3). Each step's build/test command surfaces these immediately.

# Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold `plugin-trip` and ship a working `TripArticle` surface with a Storybook story — a calendar mini-view on the left highlighting segment dates, a `SegmentStack` card list on the right, and an Add-segment toolbar action.

**Architecture:** Mirror the `plugin-inbox` CalendarArticle pattern. `Trip` and `Booking` are ECHO objects; `Segment` variants are `Schema.TaggedStruct` values stored inline in `Trip.segments[]` (following the `ContentBlock.Any` pattern from `@dxos/types`). `Provider` and `Account` are added to `@dxos/types`. No operations needed for Phase 1 — segment creation mutates `trip.segments` directly.

**Tech Stack:** Effect-TS Schema, `@dxos/echo`, `@dxos/react-ui`, `@dxos/react-ui-calendar`, `@dxos/react-ui-mosaic`, `@dxos/app-toolkit`, TailwindCSS, Vitest, Storybook.

---

## File map

### `packages/sdk/types/src/types/`

| File          | Action | Purpose                                              |
| ------------- | ------ | ---------------------------------------------------- |
| `Provider.ts` | Create | Plain `Schema.Struct` for external service reference |
| `Account.ts`  | Create | ECHO object for loyalty/membership accounts          |
| `index.ts`    | Modify | Export `Provider` and `Account` namespaces           |

### `packages/plugins/plugin-trip/`

| File                                                 | Action | Purpose                                |
| ---------------------------------------------------- | ------ | -------------------------------------- |
| `package.json`                                       | Create | npm package definition, workspace deps |
| `tsconfig.json`                                      | Create | TypeScript project references          |
| `moon.yml`                                           | Create | Build/test/storybook tasks             |
| `src/meta.ts`                                        | Create | Plugin metadata                        |
| `src/translations.ts`                                | Create | i18n strings                           |
| `src/index.ts`                                       | Create | Public barrel export                   |
| `src/plugin.ts`                                      | Create | `Plugin.lazy` entry                    |
| `src/testing.ts`                                     | Create | Eager re-export for storybook/tests    |
| `src/TripPlugin.tsx`                                 | Create | Full plugin wiring (React)             |
| `src/TripPlugin.node.ts`                             | Create | Headless plugin (schema only)          |
| `src/TripPlugin.workerd.ts`                          | Create | Worker plugin (schema only)            |
| `src/types/Place.ts`                                 | Create | `Place` plain struct                   |
| `src/types/Segment.ts`                               | Create | All 6 tagged variants + `Any` union    |
| `src/types/Booking.ts`                               | Create | `Booking` ECHO type                    |
| `src/types/Trip.ts`                                  | Create | `Trip` ECHO type                       |
| `src/types/index.ts`                                 | Create | Types barrel                           |
| `src/components/SegmentCard/SegmentCard.tsx`         | Create | Card tile for one segment              |
| `src/components/SegmentCard/index.ts`                | Create | Re-export                              |
| `src/components/SegmentStack/SegmentStack.tsx`       | Create | Mosaic virtual stack                   |
| `src/components/SegmentStack/index.ts`               | Create | Re-export                              |
| `src/components/index.ts`                            | Create | Components barrel                      |
| `src/containers/TripArticle/TripArticle.tsx`         | Create | Full article: calendar + stack         |
| `src/containers/TripArticle/TripArticle.stories.tsx` | Create | Storybook story                        |
| `src/containers/TripArticle/index.ts`                | Create | Re-export                              |
| `src/containers/index.ts`                            | Create | Containers barrel (lazy imports)       |
| `src/capabilities/react-surface.tsx`                 | Create | Surface registration                   |
| `src/capabilities/create-object.ts`                  | Create | CreateObjectEntry for Trip             |
| `src/capabilities/index.ts`                          | Create | Capabilities barrel (lazy)             |
| `src/testing/builder.ts`                             | Create | `TripBuilder` — creates test trips     |
| `src/testing/index.ts`                               | Create | Testing barrel                         |

---

## Task 1: Add `Provider` to `@dxos/types`

**Files:**

- Create: `packages/sdk/types/src/types/Provider.ts`
- Modify: `packages/sdk/types/src/types/index.ts`

- [ ] **Step 1: Create `Provider.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Ref } from '@dxos/echo';
import { Format } from '@dxos/echo/internal';

import * as Organization from './Organization';

/**
 * Reference to an external service or company.
 * Plain struct (not a Type.makeObject) — embedded inline by callers.
 * Parallel to Actor: human label + machine identifier + optional rich link.
 */
export const Provider = Schema.Struct({
  name: Schema.optional(Schema.String),
  domain: Format.Hostname.pipe(Schema.optional),
  ref: Ref.Ref(Organization.Organization).pipe(Schema.optional),
});

export interface Provider extends Schema.Schema.Type<typeof Provider> {}
```

- [ ] **Step 2: Export from `index.ts`**

In `packages/sdk/types/src/types/index.ts`, add after the `Actor` import and export:

```ts
// import (after Actor):
import * as Provider from './Provider';

// export (in "Common structs" block, after Actor):
Provider,
```

- [ ] **Step 3: Build `@dxos/types`**

```bash
moon run sdk-types:build 2>&1 | grep -v "DEPOT_TOKEN" | grep -i "error" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/sdk/types/src/types/Provider.ts packages/sdk/types/src/types/index.ts
git commit -m "feat(types): add Provider shared struct"
```

---

## Task 2: Add `Account` to `@dxos/types`

**Files:**

- Create: `packages/sdk/types/src/types/Account.ts`
- Modify: `packages/sdk/types/src/types/index.ts`

- [ ] **Step 1: Create `Account.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';

import * as AccessToken from './AccessToken';
import * as Provider from './Provider';

/**
 * A user's account / membership with an external service.
 * Used for loyalty programs (frequent flyer, hotel rewards), travel profiles,
 * and any non-credential identity at a third-party provider.
 * Distinct from AccessToken, which holds the API credential.
 */
export const Account = Schema.Struct({
  provider: Provider.Provider,
  kind: Schema.Literal('airline', 'rail', 'hotel', 'car', 'cruise', 'travel', 'other').pipe(Schema.optional),
  accountNumber: Schema.optional(Schema.String),
  displayName: Schema.optional(Schema.String),
  tier: Schema.optional(Schema.String),
  status: Schema.Literal('active', 'expired').pipe(Schema.optional),
  notes: Schema.optional(Schema.String),
  accessTokens: Schema.Array(Ref.Ref(AccessToken.AccessToken)).pipe(Schema.optional),
}).pipe(
  Type.makeObject({
    typename: 'org.dxos.type.account',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['displayName', 'provider.name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--identification-card--regular',
    hue: 'teal',
  }),
);

export interface Account extends Schema.Schema.Type<typeof Account> {}

export const instanceOf = (value: unknown): value is Account => Obj.instanceOf(Account, value);

export const make = (props: Obj.MakeProps<typeof Account>) => Obj.make(Account, props);
```

- [ ] **Step 2: Export from `index.ts`**

```ts
// import (after AccessToken):
import * as Account from './Account';

// export (in "Common object types" block, before Channel — alphabetical):
Account,
```

- [ ] **Step 3: Build and confirm**

```bash
moon run sdk-types:build 2>&1 | grep -v "DEPOT_TOKEN" | grep -i "error" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/sdk/types/src/types/Account.ts packages/sdk/types/src/types/index.ts
git commit -m "feat(types): add Account ECHO type for loyalty/membership accounts"
```

---

## Task 3: Scaffold `plugin-trip` package

**Files:** `package.json`, `moon.yml`, `src/meta.ts`, `src/translations.ts`, `src/index.ts`, `src/plugin.ts`, `src/testing.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "@dxos/plugin-trip",
  "version": "0.8.3",
  "description": "DXOS Travel itinerary plugin",
  "homepage": "https://dxos.org",
  "bugs": "https://github.com/dxos/dxos/issues",
  "repository": { "type": "git", "url": "https://github.com/dxos/dxos" },
  "license": "FSL-1.1-Apache-2.0",
  "author": "DXOS.org",
  "private": true,
  "sideEffects": true,
  "type": "module",
  "imports": {
    "#capabilities": {
      "source": "./src/capabilities/index.ts",
      "types": "./dist/types/src/capabilities/index.d.ts",
      "default": "./dist/lib/neutral/capabilities/index.mjs"
    },
    "#components": {
      "source": "./src/components/index.ts",
      "types": "./dist/types/src/components/index.d.ts",
      "default": "./dist/lib/neutral/components/index.mjs"
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
      "source": {
        "workerd": "./src/TripPlugin.workerd.ts",
        "node": "./src/TripPlugin.node.ts",
        "default": "./src/TripPlugin.tsx"
      },
      "types": "./dist/types/src/TripPlugin.d.ts",
      "workerd": "./dist/lib/neutral/TripPlugin.workerd.mjs",
      "node": "./dist/lib/neutral/TripPlugin.node.mjs",
      "default": "./dist/lib/neutral/TripPlugin.mjs"
    },
    "#testing": {
      "source": "./src/testing/index.ts",
      "types": "./dist/types/src/testing/index.d.ts",
      "default": "./dist/lib/neutral/testing/index.mjs"
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
    },
    "./testing": {
      "source": "./src/testing.ts",
      "types": "./dist/types/src/testing.d.ts",
      "default": "./dist/lib/neutral/testing.mjs"
    }
  },
  "types": "dist/types/src/index.d.ts",
  "files": ["dist", "src", "PLUGIN.mdl"],
  "dependencies": {
    "@dxos/app-framework": "workspace:*",
    "@dxos/app-toolkit": "workspace:*",
    "@dxos/echo": "workspace:*",
    "@dxos/log": "workspace:*",
    "@dxos/plugin-client": "workspace:*",
    "@dxos/plugin-graph": "workspace:*",
    "@dxos/plugin-space": "workspace:*",
    "@dxos/react-client": "workspace:*",
    "@dxos/react-ui-attention": "workspace:*",
    "@dxos/react-ui-calendar": "workspace:*",
    "@dxos/react-ui-mosaic": "workspace:*",
    "@dxos/react-ui-stack": "workspace:*",
    "@dxos/schema": "workspace:*",
    "@dxos/types": "workspace:*",
    "@dxos/util": "workspace:*",
    "@effect-atom/atom-react": "catalog:",
    "date-fns": "catalog:",
    "effect": "catalog:"
  },
  "devDependencies": {
    "@dxos/plugin-testing": "workspace:*",
    "@dxos/plugin-theme": "workspace:*",
    "@dxos/react-ui": "workspace:*",
    "@dxos/storybook-utils": "workspace:*",
    "@dxos/ui-theme": "workspace:*",
    "@types/react": "catalog:",
    "@types/react-dom": "catalog:",
    "react": "catalog:",
    "react-dom": "catalog:",
    "vite": "catalog:"
  },
  "peerDependencies": {
    "@dxos/react-ui": "workspace:*",
    "@dxos/ui-theme": "workspace:*",
    "@effect-atom/atom-react": "catalog:",
    "effect": "catalog:",
    "react": "catalog:",
    "react-dom": "catalog:"
  },
  "publishConfig": { "access": "public" }
}
```

- [ ] **Step 2: Create `moon.yml`**

```yaml
layer: library
language: typescript
tags:
  - ts-build
  - ts-test
  - ts-test-storybook
  - pack
  - storybook
tasks:
  compile:
    args:
      - '--entryPoint=src/index.ts'
      - '--entryPoint=src/TripPlugin.tsx'
      - '--entryPoint=src/TripPlugin.node.ts'
      - '--entryPoint=src/TripPlugin.workerd.ts'
      - '--entryPoint=src/capabilities/index.ts'
      - '--entryPoint=src/components/index.ts'
      - '--entryPoint=src/containers/index.ts'
      - '--entryPoint=src/meta.ts'
      - '--entryPoint=src/plugin.ts'
      - '--entryPoint=src/testing.ts'
      - '--entryPoint=src/testing/index.ts'
      - '--entryPoint=src/translations.ts'
      - '--entryPoint=src/types/index.ts'
      - '--platform=neutral'
```

- [ ] **Step 3: Create `src/meta.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.trip',
  name: 'Trip',
  author: 'DXOS',
  description: trim`
    Travel itinerary plugin for DXOS Composer. Organise trips as ordered
    sequences of typed segments (flights, trains, boats, hotels, activities)
    each linked to a booking record. View itineraries on a calendar or map.
  `,
  icon: 'ph--airplane-takeoff--regular',
  iconHue: 'sky',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-trip',
  spec: 'PLUGIN.mdl',
  tags: ['travel'],
};
```

- [ ] **Step 4: Create `src/translations.ts`**

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
        'plugin.name': 'Trip',
        'trip.new.label': 'New trip',
        'segment.add.label': 'Add segment',
        'segment.flight.label': 'Flight',
        'segment.train.label': 'Train',
        'segment.boat.label': 'Boat',
        'segment.road.label': 'Road',
        'segment.lodging.label': 'Lodging',
        'segment.activity.label': 'Activity',
      },
    },
  },
] as const satisfies Resource[];
```

- [ ] **Step 5: Create `src/index.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

export * from './meta';
export * from './types';
```

- [ ] **Step 6: Create `src/plugin.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const TripPlugin = Plugin.lazy(meta, () => import('#plugin'));
```

- [ ] **Step 7: Create `src/testing.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

// Eager re-export of TripPlugin. See @dxos/plugin-testing/src/core.ts for rationale.
export * from './TripPlugin';
```

- [ ] **Step 8: Check pnpm workspace glob covers plugin-trip**

```bash
grep "plugins/\*" pnpm-workspace.yaml
```

Expected: line `- packages/plugins/*` present (no change needed).

- [ ] **Step 9: Install**

```bash
HUSKY=0 pnpm install 2>&1 | tail -5
```

Expected: no errors, `@dxos/plugin-trip` added.

- [ ] **Step 10: Commit scaffold**

```bash
git add packages/plugins/plugin-trip/package.json packages/plugins/plugin-trip/moon.yml packages/plugins/plugin-trip/src/meta.ts packages/plugins/plugin-trip/src/translations.ts packages/plugins/plugin-trip/src/index.ts packages/plugins/plugin-trip/src/plugin.ts packages/plugins/plugin-trip/src/testing.ts
git commit -m "feat(plugin-trip): scaffold package structure"
```

---

## Task 4: Define `Place` and `Segment` types

**Files:**

- Create: `packages/plugins/plugin-trip/src/types/Place.ts`
- Create: `packages/plugins/plugin-trip/src/types/Segment.ts`

- [ ] **Step 1: Create `Place.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Format } from '@dxos/echo/internal';

/**
 * Generic location shape. Embedded inline — not an ECHO Type.makeObject.
 * Uniform across modes so Table and Map views work without per-variant branching.
 */
export const Place = Schema.Struct({
  name: Schema.optional(Schema.String),
  code: Schema.optional(Schema.String),
  city: Schema.optional(Schema.String),
  country: Schema.optional(Schema.String),
  geo: Format.GeoPoint.pipe(Schema.optional),
});

export interface Place extends Schema.Schema.Type<typeof Place> {}
```

- [ ] **Step 2: Create `Segment.ts`**

Note: `Booking` is referenced via `Ref` below, but its file (`Booking.ts`) is created in Task 5. TypeScript resolves circular imports at build time, not at schema evaluation time, so this ordering is safe.

```ts
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Ref } from '@dxos/echo';
import { Provider } from '@dxos/types';

import type * as BookingNS from './Booking';
import { Place } from './Place';

// ---------------------------------------------------------------------------
// Core fields (spread into every variant via ...Core.fields)
// ---------------------------------------------------------------------------

export const Core = Schema.Struct({
  /** Stable per-trip id. Does not change when status is promoted. */
  id: Schema.String,
  /**
   * tentative: user-authored placeholder.
   * proposed:  extractor/agent suggestion awaiting user accept.
   * confirmed: backed by a real Booking.
   * cancelled: kept for history; rendered de-emphasised.
   */
  status: Schema.Literal('tentative', 'proposed', 'confirmed', 'cancelled'),
  origin: Place.pipe(Schema.optional),
  destination: Place.pipe(Schema.optional),
  departAt: Schema.optional(Schema.String),
  arriveAt: Schema.optional(Schema.String),
  // Lazy ref — avoids circular import at module evaluation time.
  booking: Schema.optional(Schema.Any),
  notes: Schema.optional(Schema.String),
});

export interface Core extends Schema.Schema.Type<typeof Core> {}

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

export const Flight = Schema.TaggedStruct('flight', {
  ...Core.fields,
  airline: Provider.Provider.pipe(Schema.optional),
  flightNumber: Schema.optional(Schema.String),
  cabin: Schema.Literal('economy', 'premium', 'business', 'first').pipe(Schema.optional),
  terminalFrom: Schema.optional(Schema.String),
  terminalTo: Schema.optional(Schema.String),
  gateFrom: Schema.optional(Schema.String),
  gateTo: Schema.optional(Schema.String),
  seat: Schema.optional(Schema.String),
});
export interface Flight extends Schema.Schema.Type<typeof Flight> {}

export const Train = Schema.TaggedStruct('train', {
  ...Core.fields,
  operator: Provider.Provider.pipe(Schema.optional),
  trainNumber: Schema.optional(Schema.String),
  class: Schema.optional(Schema.String),
  coach: Schema.optional(Schema.String),
  seat: Schema.optional(Schema.String),
});
export interface Train extends Schema.Schema.Type<typeof Train> {}

export const Boat = Schema.TaggedStruct('boat', {
  ...Core.fields,
  operator: Provider.Provider.pipe(Schema.optional),
  vessel: Schema.optional(Schema.String),
  cabin: Schema.optional(Schema.String),
});
export interface Boat extends Schema.Schema.Type<typeof Boat> {}

export const Road = Schema.TaggedStruct('road', {
  ...Core.fields,
  subKind: Schema.Literal('bus', 'car', 'transfer', 'taxi', 'walk'),
  operator: Provider.Provider.pipe(Schema.optional),
  vehicleClass: Schema.optional(Schema.String),
});
export interface Road extends Schema.Schema.Type<typeof Road> {}

export const Lodging = Schema.TaggedStruct('lodging', {
  ...Core.fields,
  operator: Provider.Provider.pipe(Schema.optional),
  propertyName: Schema.optional(Schema.String),
  roomType: Schema.optional(Schema.String),
  checkIn: Schema.optional(Schema.String),
  checkOut: Schema.optional(Schema.String),
});
export interface Lodging extends Schema.Schema.Type<typeof Lodging> {}

export const Activity = Schema.TaggedStruct('activity', {
  ...Core.fields,
  title: Schema.String,
  operator: Provider.Provider.pipe(Schema.optional),
  venue: Place.pipe(Schema.optional),
});
export interface Activity extends Schema.Schema.Type<typeof Activity> {}

// ---------------------------------------------------------------------------
// Union
// ---------------------------------------------------------------------------

export const Any = Schema.Union(Flight, Train, Boat, Road, Lodging, Activity);
export type Any = Schema.Schema.Type<typeof Any>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Primary date for calendar highlighting and sort order. */
export const getPrimaryDate = (seg: Any): Date | undefined => {
  const iso = seg._tag === 'lodging' ? (seg.checkIn ?? seg.departAt) : seg.departAt;
  return iso ? new Date(iso) : undefined;
};

/** Short human-readable title. */
export const getTitle = (seg: Any): string => {
  switch (seg._tag) {
    case 'flight':
      return [seg.airline?.name, seg.flightNumber].filter(Boolean).join(' ') || 'Flight';
    case 'train':
      return [seg.operator?.name, seg.trainNumber].filter(Boolean).join(' ') || 'Train';
    case 'boat':
      return [seg.operator?.name, seg.vessel].filter(Boolean).join(' ') || 'Boat';
    case 'road':
      return seg.operator?.name ?? seg.subKind;
    case 'lodging':
      return seg.propertyName ?? seg.origin?.name ?? 'Lodging';
    case 'activity':
      return seg.title;
  }
};

/** Route string e.g. "JFK → LHR". */
export const getRoute = (seg: Any): string | undefined => {
  if (seg._tag === 'activity') return seg.venue?.name;
  const from = seg.origin?.code ?? seg.origin?.city ?? seg.origin?.name;
  const to = seg.destination?.code ?? seg.destination?.city ?? seg.destination?.name;
  if (!from && !to) return undefined;
  return [from, to].filter(Boolean).join(' → ');
};

/** Phosphor icon name for a segment kind. */
export const kindIcon = (tag: Any['_tag']): string => {
  switch (tag) {
    case 'flight':
      return 'ph--airplane--regular';
    case 'train':
      return 'ph--train--regular';
    case 'boat':
      return 'ph--boat--regular';
    case 'road':
      return 'ph--car--regular';
    case 'lodging':
      return 'ph--bed--regular';
    case 'activity':
      return 'ph--ticket--regular';
  }
};

/** Creates a blank segment of the given kind. */
export const makeDefault = (tag: Any['_tag'] = 'flight', id: string): Any => {
  const core: Core = { id, status: 'tentative' };
  switch (tag) {
    case 'flight':
      return { ...core, _tag: 'flight' };
    case 'train':
      return { ...core, _tag: 'train' };
    case 'boat':
      return { ...core, _tag: 'boat' };
    case 'road':
      return { ...core, _tag: 'road', subKind: 'car' };
    case 'lodging':
      return { ...core, _tag: 'lodging' };
    case 'activity':
      return { ...core, _tag: 'activity', title: 'Activity' };
  }
};
```

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/plugin-trip/src/types/Place.ts packages/plugins/plugin-trip/src/types/Segment.ts
git commit -m "feat(plugin-trip): define Place and Segment union types"
```

---

## Task 5: Define `Booking`, `Trip` + types barrel

**Files:**

- Create: `packages/plugins/plugin-trip/src/types/Booking.ts`
- Create: `packages/plugins/plugin-trip/src/types/Trip.ts`
- Create: `packages/plugins/plugin-trip/src/types/index.ts`

- [ ] **Step 1: Create `Booking.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';
import { Account, Provider } from '@dxos/types';

/**
 * A purchased ticket or reservation.
 * One Booking may back multiple Segments (e.g., round-trip under one PNR).
 */
export const Booking = Schema.Struct({
  provider: Provider.Provider.pipe(Schema.optional),
  confirmationCode: Schema.optional(Schema.String),
  bookedUnder: Ref.Ref(Account.Account).pipe(Schema.optional),
  passengers: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      account: Ref.Ref(Account.Account).pipe(Schema.optional),
    }),
  ).pipe(Schema.optional),
  currency: Schema.optional(Schema.String),
  totalPrice: Schema.optional(Schema.Number),
  purchasedAt: Schema.optional(Schema.String),
  source: Schema.Literal('manual', 'email', 'agent', 'import').pipe(Schema.optional),
  rawPayload: Schema.optional(Schema.String),
}).pipe(
  Type.makeObject({
    typename: 'org.dxos.type.trip.booking',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['confirmationCode', 'provider.name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--ticket--regular',
    hue: 'sky',
  }),
);

export interface Booking extends Schema.Schema.Type<typeof Booking> {}

export const instanceOf = (value: unknown): value is Booking => Obj.instanceOf(Booking, value);

export const make = (props: Partial<Obj.MakeProps<typeof Booking>> = {}): Booking =>
  Obj.make(Booking, { passengers: [], ...props });
```

- [ ] **Step 2: Create `Trip.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';

import * as Segment from './Segment';

/**
 * Itinerary container — ordered list of inline Segments.
 * Tags use Obj.getMeta(trip).tags (no tags field in schema).
 */
export const Trip = Schema.Struct({
  name: Schema.optional(Schema.String),
  summary: Schema.optional(Schema.String),
  startDate: Schema.optional(Schema.String),
  endDate: Schema.optional(Schema.String),
  segments: Schema.Array(Segment.Any),
}).pipe(
  Type.makeObject({
    typename: 'org.dxos.type.trip',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--airplane-takeoff--regular',
    hue: 'sky',
  }),
);

export interface Trip extends Schema.Schema.Type<typeof Trip> {}

export const instanceOf = (value: unknown): value is Trip => Obj.instanceOf(Trip, value);

export const make = (props: Partial<Obj.MakeProps<typeof Trip>> = {}): Trip =>
  Obj.make(Trip, { segments: [], ...props });
```

- [ ] **Step 3: Create `types/index.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

export * as Booking from './Booking';
export * as Place from './Place';
export * as Segment from './Segment';
export * as Trip from './Trip';
```

- [ ] **Step 4: Build plugin-trip and check for errors**

```bash
moon run plugin-trip:build 2>&1 | grep -v "DEPOT_TOKEN" | grep -i "error" | head -20
```

Expected: no TypeScript errors from type files.

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-trip/src/types/
git commit -m "feat(plugin-trip): define Booking and Trip ECHO types"
```

---

## Task 6: Create `SegmentCard` component

**Files:**

- Create: `packages/plugins/plugin-trip/src/components/SegmentCard/SegmentCard.tsx`
- Create: `packages/plugins/plugin-trip/src/components/SegmentCard/index.ts`

- [ ] **Step 1: Create `SegmentCard.tsx`**

```tsx
//
// Copyright 2026 DXOS.org
//

import { format } from 'date-fns';
import React, { forwardRef, useCallback } from 'react';

import { Card } from '@dxos/react-ui';
import { Focus, Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';

import { type Segment } from '#types';

export type SegmentCardAction = { type: 'current'; segmentId: string } | { type: 'select'; segmentId: string };
export type SegmentCardActionHandler = (action: SegmentCardAction) => void;

// ---------------------------------------------------------------------------
// SegmentTile (used by SegmentStack's VirtualStack)
// ---------------------------------------------------------------------------

type SegmentTileData = {
  segment: Segment.Any;
  onAction?: SegmentCardActionHandler;
};

type SegmentTileProps = Pick<MosaicTileProps<SegmentTileData>, 'data' | 'location' | 'current'>;

export const SegmentTile = forwardRef<HTMLDivElement, SegmentTileProps>(({ data, location, current }, forwardedRef) => {
  const { segment } = data;
  const { setCurrentId, setSelected } = useMosaicContainer('SegmentTile');

  const handleCurrentChange = useCallback(() => {
    setCurrentId(segment.id);
    setSelected(segment.id, true);
  }, [segment.id, setCurrentId, setSelected]);

  const title = Segment.getTitle(segment);
  const route = Segment.getRoute(segment);
  const date = Segment.getPrimaryDate(segment);
  const icon = Segment.kindIcon(segment._tag);
  const isCancelled = segment.status === 'cancelled';
  const isTentative = segment.status === 'tentative' || segment.status === 'proposed';

  return (
    <Mosaic.Tile
      asChild
      classNames='dx-hover dx-current dx-selected border-b border-subdued-separator'
      id={segment.id}
      data={data}
      location={location}
    >
      <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
        <Card.Root fullWidth border={false} ref={forwardedRef} classNames={isCancelled ? 'opacity-40' : undefined}>
          <Card.Content>
            <Card.Row icon={icon}>
              <Card.Text classNames={isCancelled ? 'line-through' : undefined}>{title}</Card.Text>
              {isTentative && (
                <span className='ml-2 text-xs text-description px-1 rounded bg-attentionSurface'>tentative</span>
              )}
            </Card.Row>
            {route && (
              <Card.Row icon='ph--arrow-right--regular'>
                <span className='text-description text-sm'>{route}</span>
              </Card.Row>
            )}
            {date && (
              <Card.Row icon='ph--calendar--regular'>
                <span className='text-description text-sm'>{format(date, 'PPp')}</span>
              </Card.Row>
            )}
          </Card.Content>
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
});

SegmentTile.displayName = 'SegmentTile';
```

- [ ] **Step 2: Create `SegmentCard/index.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

export * from './SegmentCard';
```

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/plugin-trip/src/components/SegmentCard/
git commit -m "feat(plugin-trip): add SegmentCard tile component"
```

---

## Task 7: Create `SegmentStack` component + components barrel

**Files:**

- Create: `packages/plugins/plugin-trip/src/components/SegmentStack/SegmentStack.tsx`
- Create: `packages/plugins/plugin-trip/src/components/SegmentStack/index.ts`
- Create: `packages/plugins/plugin-trip/src/components/index.ts`

- [ ] **Step 1: Create `SegmentStack.tsx`**

```tsx
//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent, useCallback, useMemo, useState } from 'react';

import { ScrollArea } from '@dxos/react-ui';
import { Focus, Mosaic } from '@dxos/react-ui-mosaic';
import { composable, composableProps } from '@dxos/ui-theme';

import { SegmentTile, type SegmentCardAction, type SegmentCardActionHandler } from '../SegmentCard/SegmentCard';
import { type Segment } from '#types';

export type SegmentStackProps = {
  id: string;
  segments?: Segment.Any[];
  currentId?: string;
  selectedIds?: ReadonlySet<string>;
  onAction?: SegmentCardActionHandler;
};

export const SegmentStack = composable<HTMLDivElement, SegmentStackProps>(
  ({ segments = [], currentId, selectedIds, onAction, ...props }, forwardedRef) => {
    const [viewport, setViewport] = useState<HTMLElement | null>(null);
    const items = useMemo(() => segments.map((segment) => ({ segment, onAction })), [segments, onAction]);

    const handleCurrentChange = useCallback(
      (id: string | undefined) => {
        if (id) onAction?.({ type: 'current', segmentId: id });
      },
      [onAction],
    );

    const handleSelectionChange = useCallback(
      (id: string) => {
        onAction?.({ type: 'select', segmentId: id });
      },
      [onAction],
    );

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        (document.activeElement as HTMLElement | null)?.click();
      }
    }, []);

    return (
      <Focus.Group asChild {...composableProps(props)} onKeyDown={handleKeyDown} ref={forwardedRef}>
        <Mosaic.Container
          asChild
          withFocus
          currentId={currentId}
          onCurrentChange={handleCurrentChange}
          selectedIds={selectedIds}
          onSelectionChange={handleSelectionChange}
        >
          <ScrollArea.Root orientation='vertical' padding centered>
            <ScrollArea.Viewport ref={setViewport}>
              <Mosaic.VirtualStack
                Tile={SegmentTile}
                items={items}
                draggable={false}
                getId={(item) => item.segment.id}
                getScrollElement={() => viewport}
                estimateSize={() => 96}
              />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Mosaic.Container>
      </Focus.Group>
    );
  },
);

SegmentStack.displayName = 'SegmentStack';
```

- [ ] **Step 2: Create `SegmentStack/index.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

export * from './SegmentStack';
```

- [ ] **Step 3: Create `components/index.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

export * from './SegmentCard';
export * from './SegmentStack';
```

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-trip/src/components/
git commit -m "feat(plugin-trip): add SegmentStack component"
```

---

## Task 8: Create `TripBuilder` test helper

**Files:**

- Create: `packages/plugins/plugin-trip/src/testing/builder.ts`
- Create: `packages/plugins/plugin-trip/src/testing/index.ts`

- [ ] **Step 1: Create `builder.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import { addDays, addHours, startOfDay } from 'date-fns';

import { Booking, Segment, Trip } from '#types';

export type TripBuilderResult = {
  trip: Trip.Trip;
  bookings: Booking.Booking[];
};

export class TripBuilder {
  readonly #now = new Date();
  readonly #segments: Segment.Any[] = [];
  readonly #bookings: Booking.Booking[] = [];
  #counter = 0;

  #nextId(): string {
    return `seg-${++this.#counter}`;
  }

  addFlight(daysFromNow = 0, opts: { confirmed?: boolean } = {}): this {
    const depart = addHours(startOfDay(addDays(this.#now, daysFromNow)), 10);
    const arrive = addHours(depart, 11);
    let booking: Booking.Booking | undefined;
    if (opts.confirmed) {
      booking = Booking.make({
        provider: { name: 'Air France', domain: 'united.com' as any },
        confirmationCode: `UA${100 + this.#counter}`,
        source: 'manual',
      });
      this.#bookings.push(booking);
    }
    this.#segments.push({
      _tag: 'flight',
      id: this.#nextId(),
      status: opts.confirmed ? 'confirmed' : 'tentative',
      airline: { name: 'Air France', domain: 'united.com' as any },
      flightNumber: `UA ${900 + this.#counter}`,
      cabin: 'economy',
      origin: { name: 'San Francisco Intl', code: 'SFO', city: 'San Francisco' },
      destination: { name: 'London Heathrow', code: 'LHR', city: 'London' },
      departAt: depart.toISOString(),
      arriveAt: arrive.toISOString(),
    });
    return this;
  }

  addHotel(checkInDaysFromNow = 1, nights = 3): this {
    const checkIn = startOfDay(addDays(this.#now, checkInDaysFromNow));
    const checkOut = addDays(checkIn, nights);
    this.#segments.push({
      _tag: 'lodging',
      id: this.#nextId(),
      status: 'confirmed',
      propertyName: 'The Grand Hotel',
      operator: { name: 'Marriott', domain: 'marriott.com' as any },
      origin: { name: 'The Grand Hotel', city: 'London' },
      destination: { name: 'The Grand Hotel', city: 'London' },
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      departAt: checkIn.toISOString(),
      arriveAt: checkOut.toISOString(),
    });
    return this;
  }

  addActivity(daysFromNow = 2): this {
    const start = addHours(startOfDay(addDays(this.#now, daysFromNow)), 14);
    this.#segments.push({
      _tag: 'activity',
      id: this.#nextId(),
      status: 'confirmed',
      title: 'Tower of London Tour',
      venue: { name: 'Tower of London', city: 'London' },
      departAt: start.toISOString(),
    });
    return this;
  }

  build(name = 'My Trip'): TripBuilderResult {
    return {
      trip: Trip.make({ name, segments: [...this.#segments] }),
      bookings: [...this.#bookings],
    };
  }
}
```

- [ ] **Step 2: Create `testing/index.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

export * from './builder';
```

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/plugin-trip/src/testing/
git commit -m "feat(plugin-trip): add TripBuilder test helper"
```

---

## Task 9: Create `TripArticle` container and Storybook story

**Files:**

- Create: `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx`
- Create: `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.stories.tsx`
- Create: `packages/plugins/plugin-trip/src/containers/TripArticle/index.ts`
- Create: `packages/plugins/plugin-trip/src/containers/index.ts`

- [ ] **Step 1: Create `TripArticle.tsx`**

```tsx
//
// Copyright 2026 DXOS.org
//

import { isSameDay } from 'date-fns';
import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, getObjectPathFromObject } from '@dxos/app-toolkit';
import { type AppSurface, useShowItem } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { IconButton, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { linkedSegment, useSelected } from '@dxos/react-ui-attention';
import { Calendar as NaturalCalendar } from '@dxos/react-ui-calendar';

import { SegmentStack, type SegmentCardAction } from '#components';
import { meta } from '#meta';
import { Segment, Trip } from '#types';

export type TripArticleProps = AppSurface.ObjectArticleProps<Trip.Trip>;

const byPrimaryDate = (a: Segment.Any, b: Segment.Any): number => {
  const da = Segment.getPrimaryDate(a)?.getTime() ?? 0;
  const db = Segment.getPrimaryDate(b)?.getTime() ?? 0;
  return da - db;
};

export const TripArticle = ({ role, subject, attendableId }: TripArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const showItem = useShowItem();
  const [trip] = useObject(subject);
  const id = attendableId ?? Obj.getDXN(trip).toString();
  const currentId = useSelected(id, 'single');

  const segments = [...(trip.segments ?? [])].sort(byPrimaryDate);

  const calendarDates = segments.flatMap((seg): Date[] => {
    const primary = Segment.getPrimaryDate(seg);
    const dates: Date[] = primary ? [primary] : [];
    if (seg._tag === 'lodging' && seg.checkOut) dates.push(new Date(seg.checkOut));
    return dates;
  });

  const handleDateSelect = useCallback(
    ({ date }: { date: Date }) => {
      const match = segments.find((seg) => {
        const primary = Segment.getPrimaryDate(seg);
        return primary && isSameDay(primary, date);
      });
      if (match) {
        void invokePromise(LayoutOperation.Select, {
          contextId: id,
          subject: { mode: 'single', id: match.id },
        });
      }
    },
    [segments, id, invokePromise],
  );

  const handleAction = useCallback(
    (action: SegmentCardAction) => {
      if (action.type === 'current') {
        void showItem({
          contextId: id,
          selectionId: action.segmentId,
          companion: linkedSegment('segment'),
          path: getObjectPathFromObject(trip),
        });
      }
    },
    [id, showItem, trip],
  );

  const handleAddSegment = useCallback(() => {
    const newId = `seg-${Date.now()}`;
    (trip as any).segments = [...(trip.segments ?? []), Segment.makeDefault('flight', newId)];
  }, [trip]);

  return (
    <div role={role} className='@container dx-container overflow-hidden'>
      <div className='grid grid-cols-1 @3xl:grid-cols-[min-content_1fr] h-full'>
        <Panel.Root className='hidden @3xl:block'>
          <NaturalCalendar.Root>
            <Panel.Toolbar asChild>
              <NaturalCalendar.Toolbar />
            </Panel.Toolbar>
            <Panel.Content asChild>
              <NaturalCalendar.Grid dates={calendarDates} onSelect={handleDateSelect} />
            </Panel.Content>
          </NaturalCalendar.Root>
        </Panel.Root>
        <Panel.Root>
          <Panel.Toolbar asChild>
            <Toolbar.Root>
              <IconButton icon='ph--plus--regular' label={t('segment.add.label')} onClick={handleAddSegment} />
            </Toolbar.Root>
          </Panel.Toolbar>
          <Panel.Content asChild>
            <SegmentStack id={id} segments={segments} currentId={currentId} onAction={handleAction} />
          </Panel.Content>
        </Panel.Root>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Create `TripArticle.stories.tsx`**

```tsx
//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Filter } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';

import { TripPlugin } from '../../testing';
import { TripBuilder } from '#testing';
import { Trip } from '#types';

import { TripArticle } from './TripArticle';

const DefaultStory = () => {
  const [space] = useSpaces();
  const trips = useQuery(space?.db, Filter.type(Trip.Trip));
  const trip = trips[0];

  if (!space?.db || !trip) {
    return <Loading data={{ db: !!space?.db, trip: !!trip }} />;
  }

  return <TripArticle role='article' subject={trip} attendableId='story' />;
};

const baseDecorators = (seedFn: (space: any) => Effect.Effect<void, any, any>) => [
  withLayout({ layout: 'fullscreen' }),
  withPluginManager(() => ({
    setupEvents: [AppActivationEvents.SetupSettings],
    plugins: [
      ...corePlugins(),
      ClientPlugin({
        types: [Trip.Trip],
        onClientInitialized: ({ client }) =>
          Effect.gen(function* () {
            const { personalSpace } = yield* initializeIdentity(client);
            yield* seedFn(personalSpace);
            yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
          }),
      }),
      StorybookPlugin({}),
      TripPlugin(),
      PreviewPlugin(),
    ],
  })),
];

const meta = {
  title: 'plugins/plugin-trip/containers/TripArticle',
  render: DefaultStory,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: baseDecorators((space) =>
    Effect.sync(() => {
      const { trip } = new TripBuilder()
        .addFlight(0, { confirmed: true })
        .addHotel(1, 3)
        .addActivity(2)
        .addFlight(4)
        .build('London Trip');
      space.db.add(trip);
    }),
  ),
};

export const Empty: Story = {
  decorators: baseDecorators((space) =>
    Effect.sync(() => {
      space.db.add(Trip.make({ name: 'New Trip' }));
    }),
  ),
};
```

- [ ] **Step 3: Create `TripArticle/index.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

export * from './TripArticle';
```

- [ ] **Step 4: Create `containers/index.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const TripArticle: ComponentType<any> = lazy(() => import('./TripArticle'));
```

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-trip/src/containers/
git commit -m "feat(plugin-trip): add TripArticle container and storybook story"
```

---

## Task 10: Wire capabilities and plugin entry points

**Files:**

- Create: `packages/plugins/plugin-trip/src/capabilities/react-surface.tsx`
- Create: `packages/plugins/plugin-trip/src/capabilities/create-object.ts`
- Create: `packages/plugins/plugin-trip/src/capabilities/index.ts`
- Create: `packages/plugins/plugin-trip/src/TripPlugin.tsx`
- Create: `packages/plugins/plugin-trip/src/TripPlugin.node.ts`
- Create: `packages/plugins/plugin-trip/src/TripPlugin.workerd.ts`

- [ ] **Step 1: Create `capabilities/react-surface.tsx`**

```tsx
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { TripArticle } from '#containers';
import { Trip } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'surface.trip',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Trip.Trip),
          AppSurface.object(AppSurface.Section, Trip.Trip),
        ),
        component: ({ data, role }) => (
          <TripArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
    ]),
  ),
);
```

- [ ] **Step 2: Create `capabilities/create-object.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { SpaceCapabilities, SpaceOperation } from '@dxos/plugin-space';

import { Trip } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Trip.Trip.typename,
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = Trip.make({
              name: typeof (props as any).name === 'string' ? (props as any).name : undefined,
            });
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
    ];
  }),
);
```

- [ ] **Step 3: Create `capabilities/index.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const CreateObject = Capability.lazy('CreateObject', () => import('./create-object'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
```

- [ ] **Step 4: Create `TripPlugin.tsx`**

```tsx
//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { CreateObject, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Booking, Trip } from '#types';

export const TripPlugin = Plugin.define(meta).pipe(
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addSchemaModule({ schema: [Trip.Trip, Booking.Booking] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default TripPlugin;
```

- [ ] **Step 5: Create `TripPlugin.node.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { meta } from '#meta';
import { Booking, Trip } from '#types';

export const TripPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSchemaModule({ schema: [Trip.Trip, Booking.Booking] }),
  Plugin.make,
);

export default TripPlugin;
```

- [ ] **Step 6: Create `TripPlugin.workerd.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { meta } from '#meta';
import { Booking, Trip } from '#types';

export const TripPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSchemaModule({ schema: [Trip.Trip, Booking.Booking] }),
  Plugin.make,
);

export default TripPlugin;
```

- [ ] **Step 7: Commit**

```bash
git add packages/plugins/plugin-trip/src/capabilities/ packages/plugins/plugin-trip/src/TripPlugin.tsx packages/plugins/plugin-trip/src/TripPlugin.node.ts packages/plugins/plugin-trip/src/TripPlugin.workerd.ts
git commit -m "feat(plugin-trip): wire capabilities and plugin entry points"
```

---

## Task 11: Add `tsconfig.json` and verify full build + Storybook

**Files:**

- Create: `packages/plugins/plugin-trip/tsconfig.json`

- [ ] **Step 1: Create `tsconfig.json`**

```json
{
  "extends": ["../../../tsconfig.base.json"],
  "compilerOptions": { "types": ["node"] },
  "exclude": ["*.t.ts", "vite.config.ts"],
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/*.ts"],
  "references": [
    { "path": "../../common/log" },
    { "path": "../../common/storybook-utils" },
    { "path": "../../common/util" },
    { "path": "../../core/compute/compute" },
    { "path": "../../core/echo/echo" },
    { "path": "../../core/echo/echo-react" },
    { "path": "../../sdk/app-framework" },
    { "path": "../../sdk/app-toolkit" },
    { "path": "../../sdk/react-client" },
    { "path": "../../sdk/schema" },
    { "path": "../../sdk/types" },
    { "path": "../../ui/react-ui" },
    { "path": "../../ui/react-ui-attention" },
    { "path": "../../ui/react-ui-calendar" },
    { "path": "../../ui/react-ui-mosaic" },
    { "path": "../../ui/react-ui-stack" },
    { "path": "../../ui/ui-theme" },
    { "path": "../plugin-client" },
    { "path": "../plugin-graph" },
    { "path": "../plugin-space" },
    { "path": "../plugin-testing" },
    { "path": "../plugin-theme" }
  ]
}
```

- [ ] **Step 2: Full build**

```bash
moon run plugin-trip:build 2>&1 | grep -v "DEPOT_TOKEN" | tail -20
```

Expected: exits 0, no TypeScript errors.

- [ ] **Step 3: Lint**

```bash
moon run plugin-trip:lint -- --fix 2>&1 | grep -v "DEPOT_TOKEN" | tail -10
```

Expected: exits 0.

- [ ] **Step 4: Launch Storybook and verify visually**

```bash
moon run storybook-react:serve --quiet &
```

Navigate to `http://localhost:9009` → `plugins/plugin-trip/containers/TripArticle`.

Verify `Default` story:

- Calendar panel visible at wide viewport; segment dates highlighted.
- Stack shows 4 cards: confirmed flight, hotel (lodging), activity, tentative flight.
- Tentative flight card shows "tentative" badge.

Verify `Empty` story:

- Stack is empty; Add button visible in toolbar.

Click Add button: new tentative flight card appears at bottom of stack.

- [ ] **Step 5: Commit tsconfig**

```bash
git add packages/plugins/plugin-trip/tsconfig.json
git commit -m "feat(plugin-trip): add tsconfig; Phase 1 build verified"
```

---

## Phase 1 complete

At the end of Task 11 `plugin-trip` is a buildable, lint-clean package with:

- `Provider` and `Account` added to `@dxos/types`.
- Full ECHO schema: `Trip`, `Booking`, `Segment` (6-variant tagged union), `Place`.
- `TripArticle` surface mirroring CalendarArticle: mini-calendar + SegmentStack + Add button.
- Storybook with `Default` (4 segments) and `Empty` variants.

**Next phases:**

- App-graph integration (navtree section, Trip nodes, keyboard shortcuts).
- `TravelMessageExtractor` in plugin-inbox (email → Booking + Segments).
- `TripCalendarSource` in plugin-inbox (calendar projection).
- Segment edit form / Booking attachment operations.

---

# Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the generic `MessageExtractor` contract in `plugin-inbox` and the heuristic `TravelMessageExtractor` impl in `plugin-trip` that converts Air France flight + Booking.com hotel confirmation emails into `Booking` + `Segment`s, attaches them to a Trip, and supports manual (per-message menu), agent (blueprint tool), and auto-on-arrival dispatch modes.

**Architecture:** Two-package change. plugin-inbox owns the abstract contract (`MessageExtractor` capability, `ExtractedFrom` relation, `Mailbox.extractors` config, `ExtractMessage` operation) plus the UI / blueprint / ingestion wiring. plugin-trip contributes one `MessageExtractor` registration backed by pure per-provider parser functions. All three dispatch modes funnel through the single `ExtractMessage` operation handler.

**Tech Stack:** Effect-TS Schema, `@dxos/echo`, `@dxos/echo-db/testing`, `@dxos/operation`, `@dxos/app-framework`, `@effect/vitest`, `@dxos/react-ui-menu` (for toolbar menu extension).

---

## File map — Phase 2

### `packages/plugins/plugin-inbox/`

| File                                             | Action | Purpose                                                                              |
| ------------------------------------------------ | ------ | ------------------------------------------------------------------------------------ |
| `src/types/ExtractedFrom.ts`                     | Create | Generic provenance relation (extracted obj → source Message).                        |
| `src/types/Mailbox.ts`                           | Modify | Add optional `extractors` field (`{ enabled: string[]; threshold: number }`).        |
| `src/types/index.ts`                             | Modify | Barrel-export `ExtractedFrom`.                                                       |
| `src/capabilities/MessageExtractor.ts`           | Create | Capability declaration + `MatchResult` / `ExtractResult` / `ExtractCtx` types.       |
| `src/capabilities/index.ts`                      | Modify | Re-export `MessageExtractor`.                                                        |
| `src/types/InboxCapabilities.ts`                 | Modify | Add `MessageExtractor` capability key.                                               |
| `src/types/InboxOperation.ts`                    | Modify | Add `ExtractMessage` operation definition.                                           |
| `src/operations/extract-message.ts`              | Create | Operation handler — picks extractor, runs `extract`, persists output + ExtractedFrom |
| `src/operations/index.ts`                        | Modify | Register `extract-message` in the lazy handler set.                                  |
| `src/blueprints/inbox.ts`                        | Modify | Append `InboxOperation.ExtractMessage` to `toolDefinitions.operations[]`.            |
| `src/operations/google/gmail/sync.ts`            | Modify | After each appended message, dispatch auto-on-arrival per `Mailbox.extractors`.      |
| `src/components/Message/useExtractorActions.tsx` | Create | Hook that resolves registered extractors, matches the message, returns menu items.   |
| `src/components/Message/useToolbar.tsx`          | Modify | Compose extractor menu items into the existing message toolbar.                      |
| `src/types/ExtractedFrom.test.ts`                | Create | Relation make / source / target round-trip.                                          |
| `src/operations/extract-message.test.ts`         | Create | Operation handler tests (no-match, top-confidence, error, persists ExtractedFrom).   |

### `packages/plugins/plugin-trip/`

| File                                               | Action | Purpose                                                                  |
| -------------------------------------------------- | ------ | ------------------------------------------------------------------------ |
| `package.json`                                     | Modify | Add `@dxos/plugin-inbox` workspace dep.                                  |
| `src/extractors/types.ts`                          | Create | `Parser` type — `(msg) => { booking, segments } \| null`; shared shapes. |
| `src/extractors/providers.ts`                      | Create | Known-domain → `Provider` lookup (United, Booking.com).                  |
| `src/extractors/parseUnitedFlight.ts`              | Create | Pure parser for `@united.com` confirmation emails.                       |
| `src/extractors/parseBookingComHotel.ts`           | Create | Pure parser for `@booking.com` confirmation emails.                      |
| `src/extractors/TravelMessageExtractor.ts`         | Create | `MessageExtractor` impl: dispatch + Trip resolution + Account dedup.     |
| `src/extractors/__fixtures__/united-flight.ts`     | Create | Fixture Message for canonical UA itinerary.                              |
| `src/extractors/__fixtures__/booking-com-hotel.ts` | Create | Fixture Message for canonical Booking.com confirmation.                  |
| `src/extractors/parseUnitedFlight.test.ts`         | Create | Parser unit tests (canonical, missing-fields).                           |
| `src/extractors/parseBookingComHotel.test.ts`      | Create | Parser unit tests.                                                       |
| `src/extractors/TravelMessageExtractor.test.ts`    | Create | Dispatch, Trip resolution, Account dedup.                                |
| `src/capabilities/extractor.ts`                    | Create | Capability module that registers `TravelMessageExtractor`.               |
| `src/capabilities/index.ts`                        | Modify | Re-export the new capability module.                                     |
| `src/TripPlugin.tsx`                               | Modify | Activate the extractor capability module.                                |

---

## Task 12: Add `@dxos/plugin-inbox` as workspace dep

**Files:**

- Modify: `packages/plugins/plugin-trip/package.json`

- [ ] **Step 1: Add dependency**

```bash
pnpm add --filter "@dxos/plugin-trip" --save-workspace "@dxos/plugin-inbox@workspace:*"
```

- [ ] **Step 2: Verify**

```bash
grep '"@dxos/plugin-inbox"' packages/plugins/plugin-trip/package.json
# Expected: "@dxos/plugin-inbox": "workspace:*",
```

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/plugin-trip/package.json pnpm-lock.yaml
git commit -m "chore(plugin-trip): add plugin-inbox workspace dep for MessageExtractor"
```

---

## Task 13: Create `ExtractedFrom` relation

**Files:**

- Create: `packages/plugins/plugin-inbox/src/types/ExtractedFrom.ts`
- Create: `packages/plugins/plugin-inbox/src/types/ExtractedFrom.test.ts`
- Modify: `packages/plugins/plugin-inbox/src/types/index.ts`

- [ ] **Step 1: Write the failing test**

`packages/plugins/plugin-inbox/src/types/ExtractedFrom.test.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj, Relation } from '@dxos/echo';
import { Message } from '@dxos/types';

import { ExtractedFrom } from './ExtractedFrom';

describe('ExtractedFrom', () => {
  test('relation links extracted object to source Message', ({ expect }) => {
    const message = Obj.make(Message, {
      created: new Date().toISOString(),
      sender: { email: 'noreply@united.com' },
      blocks: [],
    });
    const extracted = Obj.make(Message, {
      created: new Date().toISOString(),
      sender: { email: 'system@dxos' },
      blocks: [],
    });

    const rel = ExtractedFrom.make({
      [Relation.Source]: extracted,
      [Relation.Target]: message,
      extractorId: 'trip-travel',
      extractedAt: new Date().toISOString(),
      confidence: 0.9,
    });

    expect(rel.extractorId).toBe('trip-travel');
    expect(Relation.getSource(rel).id).toBe(extracted.id);
    expect(Relation.getTarget(rel).id).toBe(message.id);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
moon run plugin-inbox:test -- packages/plugins/plugin-inbox/src/types/ExtractedFrom.test.ts
```

Expected: FAIL with `Cannot find module './ExtractedFrom'`.

- [ ] **Step 3: Implement `ExtractedFrom.ts`**

`packages/plugins/plugin-inbox/src/types/ExtractedFrom.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Relation, Type } from '@dxos/echo';
import { Message } from '@dxos/types';

/**
 * Provenance relation. Source = the extracted object (Booking, Segment, …).
 * Target = the source Message. One relation per created object so callers
 * can walk Booking → Message and Segment → Message independently.
 */
export const ExtractedFrom = Schema.Struct({
  id: Obj.ID,
  extractorId: Schema.String,
  extractedAt: Schema.String,
  confidence: Schema.optional(Schema.Number),
}).pipe(
  Type.makeRelation({
    typename: 'org.dxos.relation.extractedFrom',
    version: '0.1.0',
    source: Obj.Unknown,
    target: Message,
  }),
);

export interface ExtractedFrom extends Schema.Schema.Type<typeof ExtractedFrom> {}

export const make = (props: Relation.MakeProps<typeof ExtractedFrom>) => Relation.make(ExtractedFrom, props);
```

- [ ] **Step 4: Re-run test**

```bash
moon run plugin-inbox:test -- packages/plugins/plugin-inbox/src/types/ExtractedFrom.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add to barrel**

In `packages/plugins/plugin-inbox/src/types/index.ts`, add `export * as ExtractedFrom from './ExtractedFrom';` next to the other type exports.

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/plugin-inbox/src/types/ExtractedFrom.ts \
        packages/plugins/plugin-inbox/src/types/ExtractedFrom.test.ts \
        packages/plugins/plugin-inbox/src/types/index.ts
git commit -m "feat(plugin-inbox): add ExtractedFrom provenance relation"
```

---

## Task 14: Declare `MessageExtractor` capability

**Files:**

- Create: `packages/plugins/plugin-inbox/src/capabilities/MessageExtractor.ts`
- Modify: `packages/plugins/plugin-inbox/src/capabilities/index.ts`
- Modify: `packages/plugins/plugin-inbox/src/types/InboxCapabilities.ts`

- [ ] **Step 1: Implement the capability module**

`packages/plugins/plugin-inbox/src/capabilities/MessageExtractor.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import { type Effect } from 'effect';

import { type AnyEchoObject, type AnyRelation, type Space } from '@dxos/client/echo';
import { type Database } from '@dxos/echo-db';
import type * as Message from '@dxos/types/Message';

export type MatchResult = {
  matched: boolean;
  confidence?: number;
  reason?: string;
};

export type ExtractCtx = {
  space: Space;
  database: Database;
};

export type ExtractResult = {
  created: AnyEchoObject[];
  relations: AnyRelation[];
  summary?: string;
};

export class ExtractError {
  readonly _tag = 'ExtractError';
  constructor(
    readonly message: string,
    readonly cause?: unknown,
  ) {}
}

export interface MessageExtractor {
  readonly id: string;
  readonly description: string;
  readonly kinds: readonly string[];
  match(message: Message.Message): MatchResult;
  extract(ctx: ExtractCtx, message: Message.Message): Effect.Effect<ExtractResult, ExtractError>;
}
```

- [ ] **Step 2: Declare the capability key**

In `packages/plugins/plugin-inbox/src/types/InboxCapabilities.ts`, append after the `Settings` declaration:

```typescript
import type { MessageExtractor as MessageExtractorImpl } from '../capabilities/MessageExtractor';

export const MessageExtractor = Capability.make<MessageExtractorImpl>(`${meta.id}.capability.messageExtractor`);
```

- [ ] **Step 3: Re-export from capabilities/index.ts**

In `packages/plugins/plugin-inbox/src/capabilities/index.ts`, add:

```typescript
export * as MessageExtractor from './MessageExtractor';
```

- [ ] **Step 4: Build**

```bash
moon run plugin-inbox:build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-inbox/src/capabilities/MessageExtractor.ts \
        packages/plugins/plugin-inbox/src/capabilities/index.ts \
        packages/plugins/plugin-inbox/src/types/InboxCapabilities.ts
git commit -m "feat(plugin-inbox): declare MessageExtractor capability"
```

---

## Task 15: Add `extractors` config to `Mailbox`

**Files:**

- Modify: `packages/plugins/plugin-inbox/src/types/Mailbox.ts`

- [ ] **Step 1: Add the optional field**

In `Mailbox.ts`, inside the `Schema.Struct({ ... })` block (before `.pipe(Type.makeObject(...))`):

```typescript
extractors: Schema.optional(
  Schema.Struct({
    enabled: Schema.Array(Schema.String),
    threshold: Schema.Number,
  }),
).pipe(FormInputAnnotation.set(false)),
```

- [ ] **Step 2: Build**

```bash
moon run plugin-inbox:build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/plugin-inbox/src/types/Mailbox.ts
git commit -m "feat(plugin-inbox): add Mailbox.extractors config for auto-on-arrival"
```

---

## Task 16: Define `ExtractMessage` operation

**Files:**

- Modify: `packages/plugins/plugin-inbox/src/types/InboxOperation.ts`

- [ ] **Step 1: Add the operation definition**

At the end of `InboxOperation.ts`, append (use the existing imports — `Operation`, `Schema`, `Capability.Service`, `Database`, `Message`):

```typescript
export const ExtractMessage = Operation.make({
  meta: { key: `${INBOX_OPERATION}.extract-message`, name: 'Extract Message' },
  services: [Capability.Service],
  input: Schema.Struct({
    db: Database.Database,
    message: Schema.suspend(() => Message.Message),
    extractorId: Schema.optional(Schema.String),
    targetTripId: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    extractorId: Schema.String,
    created: Schema.Number,
    summary: Schema.optional(Schema.String),
  }),
});
```

- [ ] **Step 2: Build**

```bash
moon run plugin-inbox:build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/plugin-inbox/src/types/InboxOperation.ts
git commit -m "feat(plugin-inbox): define ExtractMessage operation"
```

---

## Task 17: Implement the `ExtractMessage` operation handler

**Files:**

- Create: `packages/plugins/plugin-inbox/src/operations/extract-message.ts`
- Create: `packages/plugins/plugin-inbox/src/operations/extract-message.test.ts`
- Modify: `packages/plugins/plugin-inbox/src/operations/index.ts`

- [ ] **Step 1: Write the failing test**

`packages/plugins/plugin-inbox/src/operations/extract-message.test.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import { Effect, Layer } from 'effect';
import { afterEach, beforeEach, describe, expect, it } from '@effect/vitest';

import { Capability } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { Message } from '@dxos/types';

import { InboxCapabilities } from '../types';
import { InboxOperation } from '../types/InboxOperation';
import { ExtractedFrom } from '../types/ExtractedFrom';
import handler from './extract-message';

const makeMessage = (overrides?: Partial<Message.Message>): Message.Message =>
  Obj.make(Message, {
    created: new Date().toISOString(),
    sender: { email: 'noreply@example.com' },
    blocks: [],
    ...overrides,
  });

describe('extract-message', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  it.effect('returns no-match error when no extractor matches', () =>
    Effect.gen(function* () {
      const { db } = yield* Effect.promise(() => builder.createDatabase({ types: [Message, ExtractedFrom] }));
      const message = db.add(makeMessage());
      yield* Effect.promise(() => db.flush());

      const capabilities = Capability.makeRegistry([
        Capability.contributes(InboxCapabilities.MessageExtractor, {
          id: 'noop',
          description: 'never matches',
          kinds: [],
          match: () => ({ matched: false }),
          extract: () => Effect.die('unreachable'),
        }),
      ]);

      const result = yield* handler
        .run({ db, message, extractorId: undefined, targetTripId: undefined })
        .pipe(Effect.provide(capabilities), Effect.either);

      expect(result._tag).toBe('Left');
    }),
  );
});
```

- [ ] **Step 2: Run to verify failure**

```bash
moon run plugin-inbox:test -- packages/plugins/plugin-inbox/src/operations/extract-message.test.ts
```

Expected: FAIL — module `./extract-message` missing.

- [ ] **Step 3: Implement the handler**

`packages/plugins/plugin-inbox/src/operations/extract-message.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import { Effect, Either } from 'effect';

import { Capability } from '@dxos/app-framework';
import { Obj, Relation } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { InboxCapabilities } from '../types';
import { InboxOperation } from '../types/InboxOperation';
import * as ExtractedFrom from '../types/ExtractedFrom';
import type { MessageExtractor } from '../capabilities/MessageExtractor';

class NoMatchingExtractor {
  readonly _tag = 'NoMatchingExtractor';
}

const handler: Operation.WithHandler<typeof InboxOperation.ExtractMessage> = InboxOperation.ExtractMessage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ db, message, extractorId, targetTripId }) {
      const extractors = yield* Capability.getAll(InboxCapabilities.MessageExtractor);

      // Pick extractor by id, or highest-confidence matching one.
      let chosen: MessageExtractor | undefined;
      let confidence = 0;
      for (const extractor of extractors) {
        if (extractorId && extractor.id !== extractorId) {
          continue;
        }
        const result = extractor.match(message);
        if (!result.matched) {
          continue;
        }
        if (extractorId || (result.confidence ?? 0) > confidence) {
          chosen = extractor;
          confidence = result.confidence ?? 0;
          if (extractorId) break;
        }
      }
      if (!chosen) {
        return yield* Effect.fail(new NoMatchingExtractor());
      }

      const space = (db as any).space; // EchoDatabase exposes the owning Space.
      const result = yield* chosen.extract({ space, database: db }, message);

      for (const obj of result.created) {
        db.add(obj);
      }
      const extractedAt = new Date().toISOString();
      for (const created of result.created) {
        const rel = ExtractedFrom.make({
          [Relation.Source]: created,
          [Relation.Target]: message,
          extractorId: chosen.id,
          extractedAt,
          confidence,
        });
        db.add(rel);
      }
      for (const rel of result.relations) {
        db.add(rel);
      }

      return {
        extractorId: chosen.id,
        created: result.created.length,
        summary: result.summary,
      };
    }),
  ),
);

export default handler;
```

- [ ] **Step 4: Register in the operations barrel**

In `packages/plugins/plugin-inbox/src/operations/index.ts`, find the `OperationHandlerSet.lazy(...)` array and add a new entry:

```typescript
() => import('./extract-message'),
```

- [ ] **Step 5: Re-run test**

```bash
moon run plugin-inbox:test -- packages/plugins/plugin-inbox/src/operations/extract-message.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/plugin-inbox/src/operations/extract-message.ts \
        packages/plugins/plugin-inbox/src/operations/extract-message.test.ts \
        packages/plugins/plugin-inbox/src/operations/index.ts
git commit -m "feat(plugin-inbox): add ExtractMessage operation handler"
```

---

## Task 18: Wire extractor menu items into message toolbar

**Files:**

- Create: `packages/plugins/plugin-inbox/src/components/Message/useExtractorActions.tsx`
- Modify: `packages/plugins/plugin-inbox/src/components/Message/useToolbar.tsx`

- [ ] **Step 1: Build the hook**

`packages/plugins/plugin-inbox/src/components/Message/useExtractorActions.tsx`:

```typescript
//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';
import { getSpace } from '@dxos/react-client/echo';
import type * as Message from '@dxos/types/Message';

import { InboxCapabilities } from '../../types';
import { InboxOperation } from '../../types/InboxOperation';

export type ExtractorMenuItem = {
  id: string;
  label: string;
  onSelect: () => void;
};

export const useExtractorActions = (message: Message.Message): ExtractorMenuItem[] => {
  const extractors = useCapabilities(InboxCapabilities.MessageExtractor);
  const { invokePromise } = useOperationInvoker();

  return useMemo(() => {
    return extractors
      .filter((extractor) => extractor.match(message).matched)
      .map((extractor) => ({
        id: extractor.id,
        label: extractor.description,
        onSelect: () => {
          const space = getSpace(message);
          if (!space) return;
          void invokePromise(InboxOperation.ExtractMessage, {
            db: space.db,
            message,
            extractorId: extractor.id,
            targetTripId: undefined,
          });
        },
      }));
  }, [extractors, message, invokePromise]);
};
```

- [ ] **Step 2: Compose into useToolbar**

In `useToolbar.tsx`, locate the `useMessageActions` builder (where the existing `.action('open', ...)` and `.action('renderMode', ...)` calls live). After the existing actions, before `.build()`, add:

```typescript
const extractorActions = useExtractorActions(message);
for (const item of extractorActions) {
  menu = menu.action(`extract-${item.id}`, { label: item.label, icon: 'ph--magic-wand--regular' }, item.onSelect);
}
```

Add the import:

```typescript
import { useExtractorActions } from './useExtractorActions';
```

- [ ] **Step 3: Storybook smoke**

```bash
moon run plugin-inbox:test-storybook -- --grep "Message"
```

Expected: PASS (no new stories yet; existing stories must still render).

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-inbox/src/components/Message/useExtractorActions.tsx \
        packages/plugins/plugin-inbox/src/components/Message/useToolbar.tsx
git commit -m "feat(plugin-inbox): show registered extractors in message toolbar"
```

---

## Task 19: Expose `ExtractMessage` as an agent tool

**Files:**

- Modify: `packages/plugins/plugin-inbox/src/blueprints/inbox.ts`

- [ ] **Step 1: Append the operation to the blueprint tool list**

In the `tools: Blueprint.toolDefinitions({ operations: [...] })` block, add `InboxOperation.ExtractMessage` after `InboxOperation.GoogleMailSync`:

```typescript
operations: [
  InboxOperation.ClassifyEmail,
  InboxOperation.DraftEmail,
  InboxOperation.ReadEmail,
  InboxOperation.GoogleMailSync,
  InboxOperation.ExtractMessage,
],
```

- [ ] **Step 2: Update the blueprint instructions**

Add a sentence to the `instructions` template (same file) telling the agent: "Use `ExtractMessage` to parse a confirmation email (e.g., flight, hotel) into structured objects."

- [ ] **Step 3: Build**

```bash
moon run plugin-inbox:build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-inbox/src/blueprints/inbox.ts
git commit -m "feat(plugin-inbox): expose ExtractMessage as inbox blueprint tool"
```

---

## Task 20: Auto-on-arrival hook in `GoogleMailSync`

**Files:**

- Modify: `packages/plugins/plugin-inbox/src/operations/google/gmail/sync.ts`

- [ ] **Step 1: Locate the message append site**

```bash
grep -n "feed.append\|appendMessage\|messages.push" packages/plugins/plugin-inbox/src/operations/google/gmail/sync.ts
```

Note the line where new messages are persisted in the loop.

- [ ] **Step 2: Inject the dispatch**

Immediately after the message is appended to the feed, add:

```typescript
const extractors = yield * Capability.getAll(InboxCapabilities.MessageExtractor);
const config = mailbox.extractors;
if (config && config.enabled.length > 0) {
  let best: { extractor: (typeof extractors)[number]; confidence: number } | undefined;
  for (const extractor of extractors) {
    if (!config.enabled.includes(extractor.id)) continue;
    const result = extractor.match(message);
    if (!result.matched) continue;
    if ((result.confidence ?? 0) >= config.threshold && (!best || (result.confidence ?? 0) > best.confidence)) {
      best = { extractor, confidence: result.confidence ?? 0 };
    }
  }
  if (best) {
    yield *
      OperationInvoker.invoke(InboxOperation.ExtractMessage, {
        db,
        message,
        extractorId: best.extractor.id,
        targetTripId: undefined,
      }).pipe(Effect.catchAll(() => Effect.void));
  }
}
```

Add imports as needed: `InboxCapabilities`, `InboxOperation`, `Capability`, `OperationInvoker`.

- [ ] **Step 3: Build**

```bash
moon run plugin-inbox:build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-inbox/src/operations/google/gmail/sync.ts
git commit -m "feat(plugin-inbox): dispatch enabled extractors on message arrival"
```

---

## Task 21: `parseUnitedFlight` parser + fixture + tests

**Files:**

- Create: `packages/plugins/plugin-trip/src/extractors/types.ts`
- Create: `packages/plugins/plugin-trip/src/extractors/providers.ts`
- Create: `packages/plugins/plugin-trip/src/extractors/parseUnitedFlight.ts`
- Create: `packages/plugins/plugin-trip/src/extractors/__fixtures__/united-flight.ts`
- Create: `packages/plugins/plugin-trip/src/extractors/parseUnitedFlight.test.ts`

- [ ] **Step 1: Define shared parser types**

`packages/plugins/plugin-trip/src/extractors/types.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import type { Booking, Segment } from '#types';
import type * as Message from '@dxos/types/Message';

export type ParseResult = {
  booking: ReturnType<typeof Booking.make>;
  segments: Segment.Segment[];
  confidence: number;
};

export type Parser = (message: Message.Message) => ParseResult | null;
```

- [ ] **Step 2: Define the providers table**

`packages/plugins/plugin-trip/src/extractors/providers.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import { Provider } from '@dxos/types';

export const UNITED: Provider.Provider = { name: 'Air France', domain: 'united.com' };
export const BOOKING_COM: Provider.Provider = { name: 'Booking.com', domain: 'booking.com' };

export const lookupBySenderDomain = (email: string | undefined): Provider.Provider | undefined => {
  if (!email) return undefined;
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return undefined;
  if (domain === 'united.com' || domain.endsWith('.united.com')) return UNITED;
  if (domain === 'booking.com' || domain.endsWith('.booking.com')) return BOOKING_COM;
  return undefined;
};
```

- [ ] **Step 3: Write the failing parser test**

`packages/plugins/plugin-trip/src/extractors/parseUnitedFlight.test.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { unitedFlightFixture } from './__fixtures__/united-flight';
import { parseUnitedFlight } from './parseUnitedFlight';

describe('parseUnitedFlight', () => {
  test('parses canonical UA eTicket itinerary', ({ expect }) => {
    const result = parseUnitedFlight(unitedFlightFixture());
    expect(result).not.toBeNull();
    expect(result!.confidence).toBeGreaterThanOrEqual(0.9);
    expect(result!.booking.confirmationCode).toBe('ABC123');
    expect(result!.segments.length).toBe(1);
    const segment = result!.segments[0];
    expect(segment.kind).toBe('flight');
    expect(segment.airline?.name).toBe('Air France');
    expect(segment.flightNumber).toBe('UA 904');
    expect(segment.origin?.code).toBe('SFO');
    expect(segment.destination?.code).toBe('LHR');
  });

  test('returns null when sender does not match', ({ expect }) => {
    const fixture = unitedFlightFixture();
    (fixture as any).sender = { email: 'random@elsewhere.com' };
    expect(parseUnitedFlight(fixture)).toBeNull();
  });

  test('returns null when confirmation code is missing', ({ expect }) => {
    const fixture = unitedFlightFixture({ withConfirmationCode: false });
    expect(parseUnitedFlight(fixture)).toBeNull();
  });
});
```

- [ ] **Step 4: Write the fixture**

`packages/plugins/plugin-trip/src/extractors/__fixtures__/united-flight.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';
import { Message } from '@dxos/types';

const BODY = `Hello,
Your reservation is confirmed.

Confirmation: ABC123

UA 904  SFO → LHR
Depart: 2026-08-12 18:30 SFO
Arrive: 2026-08-13 12:45 LHR
Cabin: Economy
Seat: 21A

Thank you for flying United.`;

export const unitedFlightFixture = (opts: { withConfirmationCode?: boolean } = {}): Message.Message => {
  const body = opts.withConfirmationCode === false ? BODY.replace(/Confirmation:.*\n/, '') : BODY;
  return Obj.make(Message, {
    created: '2026-08-01T10:00:00Z',
    sender: { email: 'noreply@united.com', name: 'Air France' },
    properties: { subject: 'Your eTicket Itinerary — UA 904' },
    blocks: [{ kind: 'text', content: body }],
  });
};
```

- [ ] **Step 5: Implement the parser**

`packages/plugins/plugin-trip/src/extractors/parseUnitedFlight.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import { Booking, Segment } from '#types';

import { lookupBySenderDomain, UNITED } from './providers';
import type { Parser } from './types';

const CONFIRMATION = /Confirmation:\s*([A-Z0-9]{4,10})/;
const FLIGHT = /UA\s*(\d{1,4})\s+([A-Z]{3})\s*[→\-]+\s*([A-Z]{3})/;
const DEPART = /Depart:\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/;
const ARRIVE = /Arrive:\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/;
const CABIN = /Cabin:\s*(Economy|Premium|Business|First)/i;
const SEAT = /Seat:\s*([0-9]+[A-Z])/;

const pickText = (message: { blocks: Array<{ kind: string; content?: string }> }): string =>
  message.blocks
    .filter((b) => b.kind === 'text')
    .map((b) => b.content ?? '')
    .join('\n');

export const parseUnitedFlight: Parser = (message) => {
  if (lookupBySenderDomain(message.sender.email) !== UNITED) return null;
  const body = pickText(message as any);

  const confirmation = CONFIRMATION.exec(body)?.[1];
  const flight = FLIGHT.exec(body);
  if (!confirmation || !flight) return null;

  const depart = DEPART.exec(body);
  const arrive = ARRIVE.exec(body);
  const cabin = CABIN.exec(body)?.[1]?.toLowerCase();
  const seat = SEAT.exec(body)?.[1];

  const booking = Booking.make({
    provider: UNITED,
    confirmationCode: confirmation,
    source: 'email',
    rawPayload: body,
  });
  const segment = Segment.make({
    status: 'confirmed',
    kind: 'flight',
    airline: UNITED,
    flightNumber: `UA ${flight[1]}`,
    origin: { name: flight[2], code: flight[2] },
    destination: { name: flight[3], code: flight[3] },
    departAt: depart ? `${depart[1]}T${depart[2]}:00Z` : undefined,
    arriveAt: arrive ? `${arrive[1]}T${arrive[2]}:00Z` : undefined,
    cabin: (cabin as any) ?? undefined,
    seat,
  });

  return { booking, segments: [segment], confidence: 0.9 };
};
```

- [ ] **Step 6: Run tests**

```bash
moon run plugin-trip:test -- packages/plugins/plugin-trip/src/extractors/parseUnitedFlight.test.ts
```

Expected: 3 PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/plugins/plugin-trip/src/extractors
git commit -m "feat(plugin-trip): heuristic parseUnitedFlight + fixtures + tests"
```

---

## Task 22: `parseBookingComHotel` parser + fixture + tests

**Files:**

- Create: `packages/plugins/plugin-trip/src/extractors/parseBookingComHotel.ts`
- Create: `packages/plugins/plugin-trip/src/extractors/__fixtures__/booking-com-hotel.ts`
- Create: `packages/plugins/plugin-trip/src/extractors/parseBookingComHotel.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/plugins/plugin-trip/src/extractors/parseBookingComHotel.test.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { bookingComHotelFixture } from './__fixtures__/booking-com-hotel';
import { parseBookingComHotel } from './parseBookingComHotel';

describe('parseBookingComHotel', () => {
  test('parses canonical Booking.com confirmation', ({ expect }) => {
    const result = parseBookingComHotel(bookingComHotelFixture());
    expect(result).not.toBeNull();
    expect(result!.confidence).toBeGreaterThanOrEqual(0.9);
    expect(result!.booking.confirmationCode).toBe('3456789012');
    const segment = result!.segments[0];
    expect(segment.kind).toBe('accommodation');
    expect(segment.propertyName).toContain('Grand Hotel');
    expect(segment.checkIn).toContain('2026-08-13');
    expect(segment.checkOut).toContain('2026-08-15');
  });

  test('returns null when sender does not match', ({ expect }) => {
    const fixture = bookingComHotelFixture();
    (fixture as any).sender = { email: 'other@elsewhere.com' };
    expect(parseBookingComHotel(fixture)).toBeNull();
  });
});
```

- [ ] **Step 2: Write the fixture**

`packages/plugins/plugin-trip/src/extractors/__fixtures__/booking-com-hotel.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';
import { Message } from '@dxos/types';

const BODY = `Hello,

Your booking is confirmed.

Booking number: 3456789012
Property: Grand Hotel London
City: London
Check-in: Thu, Aug 13, 2026
Check-out: Sat, Aug 15, 2026
Room: Deluxe Double`;

export const bookingComHotelFixture = (): Message.Message =>
  Obj.make(Message, {
    created: '2026-08-01T10:00:00Z',
    sender: { email: 'noreply@booking.com', name: 'Booking.com' },
    properties: { subject: 'Booking confirmation #3456789012' },
    blocks: [{ kind: 'text', content: BODY }],
  });
```

- [ ] **Step 3: Implement the parser**

`packages/plugins/plugin-trip/src/extractors/parseBookingComHotel.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import { Booking, Segment } from '#types';

import { BOOKING_COM, lookupBySenderDomain } from './providers';
import type { Parser } from './types';

const BOOKING_NUMBER = /Booking number:\s*(\d{6,})/;
const PROPERTY = /Property:\s*(.+)/;
const CITY = /City:\s*(.+)/;
const CHECK_IN = /Check-in:\s*[A-Za-z]+,?\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/;
const CHECK_OUT = /Check-out:\s*[A-Za-z]+,?\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/;
const ROOM = /Room:\s*(.+)/;

const toISO = (s: string): string | undefined => {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};

const pickText = (message: { blocks: Array<{ kind: string; content?: string }> }): string =>
  message.blocks
    .filter((b) => b.kind === 'text')
    .map((b) => b.content ?? '')
    .join('\n');

export const parseBookingComHotel: Parser = (message) => {
  if (lookupBySenderDomain(message.sender.email) !== BOOKING_COM) return null;
  const body = pickText(message as any);

  const confirmation = BOOKING_NUMBER.exec(body)?.[1];
  const checkIn = toISO(CHECK_IN.exec(body)?.[1] ?? '');
  const checkOut = toISO(CHECK_OUT.exec(body)?.[1] ?? '');
  if (!confirmation || !checkIn || !checkOut) return null;

  const property = PROPERTY.exec(body)?.[1]?.trim();
  const city = CITY.exec(body)?.[1]?.trim();
  const room = ROOM.exec(body)?.[1]?.trim();

  const booking = Booking.make({
    provider: BOOKING_COM,
    confirmationCode: confirmation,
    source: 'email',
    rawPayload: body,
  });
  const segment = Segment.make({
    status: 'confirmed',
    kind: 'accommodation',
    propertyName: property,
    roomType: room,
    origin: city ? { name: city, city } : undefined,
    checkIn,
    checkOut,
  });

  return { booking, segments: [segment], confidence: 0.9 };
};
```

- [ ] **Step 4: Run tests**

```bash
moon run plugin-trip:test -- packages/plugins/plugin-trip/src/extractors/parseBookingComHotel.test.ts
```

Expected: 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-trip/src/extractors/parseBookingComHotel.ts \
        packages/plugins/plugin-trip/src/extractors/parseBookingComHotel.test.ts \
        packages/plugins/plugin-trip/src/extractors/__fixtures__/booking-com-hotel.ts
git commit -m "feat(plugin-trip): heuristic parseBookingComHotel + fixtures + tests"
```

---

## Task 23: `TravelMessageExtractor` impl + tests

**Files:**

- Create: `packages/plugins/plugin-trip/src/extractors/TravelMessageExtractor.ts`
- Create: `packages/plugins/plugin-trip/src/extractors/TravelMessageExtractor.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/plugins/plugin-trip/src/extractors/TravelMessageExtractor.test.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import { Effect } from 'effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { type EchoDatabase } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';

import { Booking, Segment, Trip } from '#types';

import { TravelMessageExtractor } from './TravelMessageExtractor';
import { unitedFlightFixture } from './__fixtures__/united-flight';
import { bookingComHotelFixture } from './__fixtures__/booking-com-hotel';

describe('TravelMessageExtractor', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    const result = await builder.createDatabase({ types: [Trip.Trip, Segment.Segment, Booking.Booking] });
    db = result.db;
  });

  afterEach(async () => {
    await builder.close();
  });

  test('match() returns true for known providers, false otherwise', ({ expect }) => {
    expect(TravelMessageExtractor.match(unitedFlightFixture()).matched).toBe(true);
    expect(TravelMessageExtractor.match(bookingComHotelFixture()).matched).toBe(true);
    const unknown = unitedFlightFixture();
    (unknown as any).sender = { email: 'random@elsewhere.com' };
    expect(TravelMessageExtractor.match(unknown).matched).toBe(false);
  });

  test('extract() creates Booking + Segment and a new Trip when none exists', async ({ expect }) => {
    const result = await Effect.runPromise(
      TravelMessageExtractor.extract({ space: (db as any).space, database: db }, unitedFlightFixture()),
    );
    expect(result.created.some((o: any) => o.kind === 'flight')).toBe(true);
    expect(result.created.some((o: any) => o.provider)).toBe(true);
    expect(result.created.some((o: any) => Array.isArray(o.segments))).toBe(true);
  });

  test('extract() appends to most-recently-updated Trip when one exists', async ({ expect }) => {
    const existing = db.add(Trip.make({ name: 'Existing' }));
    await db.flush();

    const result = await Effect.runPromise(
      TravelMessageExtractor.extract({ space: (db as any).space, database: db }, unitedFlightFixture()),
    );
    // No new trip should be created.
    expect(result.created.some((o: any) => Array.isArray(o.segments))).toBe(false);
    // Existing trip should now have a segment.
    expect(existing.segments.length).toBe(1);
  });
});
```

- [ ] **Step 2: Implement the extractor**

`packages/plugins/plugin-trip/src/extractors/TravelMessageExtractor.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import { Effect } from 'effect';

import { Filter } from '@dxos/echo';
import type { MessageExtractor, MatchResult, ExtractResult, ExtractCtx, ExtractError } from '@dxos/plugin-inbox';
import type * as Message from '@dxos/types/Message';

import { Trip } from '#types';

import { parseBookingComHotel } from './parseBookingComHotel';
import { parseUnitedFlight } from './parseUnitedFlight';
import type { Parser } from './types';

const PARSERS: ReadonlyArray<Parser> = [parseUnitedFlight, parseBookingComHotel];

const pickMostRecent = (trips: ReadonlyArray<Trip.Trip>): Trip.Trip | undefined => {
  if (trips.length === 0) return undefined;
  return [...trips].sort((a, b) => {
    const av = (a as any).__updated ?? 0;
    const bv = (b as any).__updated ?? 0;
    return bv - av;
  })[0];
};

export const TravelMessageExtractor: MessageExtractor = {
  id: 'trip-travel',
  description: 'Extract travel from confirmation email',
  kinds: ['flight', 'accommodation'],

  match(message: Message.Message): MatchResult {
    for (const parser of PARSERS) {
      const result = parser(message);
      if (result) {
        return { matched: true, confidence: result.confidence };
      }
    }
    return { matched: false };
  },

  extract: Effect.fnUntraced(function* (ctx: ExtractCtx, message: Message.Message) {
    let parsed: ReturnType<Parser> = null;
    for (const parser of PARSERS) {
      parsed = parser(message);
      if (parsed) break;
    }
    if (!parsed) {
      return yield* Effect.fail({ _tag: 'ExtractError', message: 'no parser matched' } as ExtractError);
    }

    const { booking, segments } = parsed;

    // Resolve Trip: most-recently-updated, else new.
    const existingTrips = yield* Effect.promise(() => ctx.database.runQuery(Filter.type(Trip.Trip)).run());
    let trip = pickMostRecent(existingTrips);
    const created: any[] = [booking, ...segments];
    if (!trip) {
      trip = Trip.make({ name: parsed.booking.provider.name ?? 'Trip' });
      created.push(trip);
    }

    // Persist segments first so refs are valid, then link to trip.
    for (const segment of segments) {
      ctx.database.add(segment);
      Trip.addSegment(trip, segment);
    }
    ctx.database.add(booking);
    if (created.includes(trip)) {
      ctx.database.add(trip);
    }

    return {
      created,
      relations: [],
      summary: `Extracted ${parsed.booking.provider.name} booking ${parsed.booking.confirmationCode}`,
    } satisfies ExtractResult;
  }),
};
```

- [ ] **Step 3: Re-export from package barrel**

In `packages/plugins/plugin-inbox/src/index.ts`, confirm `MessageExtractor` type + `MatchResult` + `ExtractResult` + `ExtractCtx` + `ExtractError` are exported. Add them if missing.

- [ ] **Step 4: Run tests**

```bash
moon run plugin-trip:test -- packages/plugins/plugin-trip/src/extractors/TravelMessageExtractor.test.ts
```

Expected: 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-trip/src/extractors/TravelMessageExtractor.ts \
        packages/plugins/plugin-trip/src/extractors/TravelMessageExtractor.test.ts \
        packages/plugins/plugin-inbox/src/index.ts
git commit -m "feat(plugin-trip): TravelMessageExtractor dispatch + Trip resolution"
```

---

## Task 24: Register `TravelMessageExtractor` capability

**Files:**

- Create: `packages/plugins/plugin-trip/src/capabilities/extractor.ts`
- Modify: `packages/plugins/plugin-trip/src/capabilities/index.ts`
- Modify: `packages/plugins/plugin-trip/src/TripPlugin.tsx`

- [ ] **Step 1: Create the capability module**

`packages/plugins/plugin-trip/src/capabilities/extractor.ts`:

```typescript
//
// Copyright 2026 DXOS.org
//

import { Effect } from 'effect';

import { Capability } from '@dxos/app-framework';
import { InboxCapabilities } from '@dxos/plugin-inbox';

import { TravelMessageExtractor } from '../extractors/TravelMessageExtractor';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(InboxCapabilities.MessageExtractor, TravelMessageExtractor);
  }),
);
```

- [ ] **Step 2: Re-export from capabilities barrel**

In `packages/plugins/plugin-trip/src/capabilities/index.ts`, add:

```typescript
export { default as Extractor } from './extractor';
```

- [ ] **Step 3: Activate in the plugin**

In `TripPlugin.tsx`, where other capability modules are activated (next to the existing `addOperationHandlerModule` / `react-surface` activations), add:

```typescript
AppPlugin.addCapabilityModule({ activate: Extractor }),
```

Add the import:

```typescript
import { Extractor } from './capabilities';
```

- [ ] **Step 4: Build**

```bash
moon run plugin-trip:build && moon run plugin-inbox:build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-trip/src/capabilities/extractor.ts \
        packages/plugins/plugin-trip/src/capabilities/index.ts \
        packages/plugins/plugin-trip/src/TripPlugin.tsx
git commit -m "feat(plugin-trip): register TravelMessageExtractor capability"
```

---

## Task 25: Phase 2 close-out

**Files:**

- Modify: `packages/plugins/plugin-trip/PLAN.md`
- Modify: `packages/plugins/plugin-trip/PHASE2.md`

- [ ] **Step 1: Full lint + test sweep**

```bash
moon run :lint -- --fix
MOON_CONCURRENCY=4 moon run plugin-trip:test plugin-inbox:test
```

Expected: PASS.

- [ ] **Step 2: Manual smoke (composer-app)**

Start the app, create a Trip, paste a UA confirmation email into a Mailbox message, open the message → click the extractor menu item → confirm a Booking + Flight Segment appear under the Trip and an `ExtractedFrom` row exists in the database panel.

- [ ] **Step 3: Mark PHASE2.md item 2.1 + 2.2 complete**

Tick off the matching items in `packages/plugins/plugin-trip/PHASE2.md` "Suggested PR slicing".

- [ ] **Step 4: Append "Phase 2 complete" summary to this PLAN.md**

```markdown
## Phase 2 complete

- `MessageExtractor` capability + `ExtractedFrom` relation in plugin-inbox.
- `ExtractMessage` operation routes manual, agent, and auto-on-arrival dispatch.
- `TravelMessageExtractor` ships parseUnitedFlight + parseBookingComHotel.
- Per-message extractor menu items in the inbox toolbar.
- All three dispatch modes wired end-to-end.

**Next phases:**

- Agent-backed parser variant (AiService-driven).
- Additional carriers (BA, Lufthansa, Eurostar, Avis, …).
- `TripCalendarSource` (PHASE2 §2.3-2.4).
- Trip picker UI in the manual extraction flow.
```

- [ ] **Step 5: Commit + push**

```bash
git add packages/plugins/plugin-trip/PLAN.md packages/plugins/plugin-trip/PHASE2.md
git commit -m "docs(plugin-trip): Phase 2 close-out"
git push
```

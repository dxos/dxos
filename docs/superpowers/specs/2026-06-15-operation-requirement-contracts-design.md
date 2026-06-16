# Operation requirement contracts — loosely-coupled cross-plugin operations

Date: 2026-06-15
Status: exploratory design

## Problem

Plugins surface operations onto _other_ plugins' objects (e.g. plugin-trip's "Plan trip from
calendar" appears on a plugin-inbox `Calendar`). The operation needs context data — here a **date
range** — that the host (inbox) owns. Today that data is passed _implicitly_:

1. inbox writes the selected range into a shared `ViewState` selection aspect under a string key
   (`getCalendarRangeSelectionId(id)` = `${id}/plan-range`).
2. trip's contributed graph-action reads it back by reconstructing the same key, then invokes its own
   operation.

This is brittle:

- **Stringly-typed contract.** Both plugins must agree on a key; trip imports a helper from inbox's
  root barrel solely to recompute it.
- **Provider is the caller.** trip both supplies the menu item and reaches into host state — the host
  has no say in _what_ it provides or _how_.
- **Not remote-safe.** A remote/out-of-process provider can't read the client's `ViewState`, so the
  whole mechanism fails the moment the operation isn't co-located with the UI.
- **No visibility gating.** Nothing structurally prevents offering an operation whose context can't be
  satisfied; it just fails or no-ops at call time.

## Goal

Loosely couple plugins via **explicit, self-describing contracts**. A provider _declares the data an
operation requires_; a host _declares what it can provide_; the framework brokers the two. Neither side
imports the other's concrete keys or types. The operation's semantics stay opaque to the host — the user
sees a menu item; the framework guarantees the payload is well-formed before invocation.

## Proposal: requirement kinds, resolvers, and a broker

### 1. Requirement kind (the contract token)

A **requirement kind** is a registered semantic token (a DXN) plus an Effect Schema for its payload. It
lives in a neutral package (e.g. `@dxos/app-toolkit`), so both provider and host depend only on the
registry — never on each other.

```ts
// @dxos/app-toolkit (neutral)
export const DateRange = Requirement.define(
  'dxos.org/requirement/date-range',
  Schema.Struct({ from: Schema.Date, to: Schema.Date }),
);
export const TargetObject = <T>(type: Schema.Schema<T>) =>
  Requirement.define('dxos.org/requirement/object', Ref.Ref(type));
export const Selection = Requirement.define('dxos.org/requirement/selection' /* … */);
```

### 2. Provider side — operations declare requirements

The operation's input is composed of requirement slots. The handler receives a validated, fully-resolved
payload; it never reads UI state.

```ts
export const PlanTrip = Operation.make({
  meta: { key: 'dxos.org/plugin-trip/plan-trip' },
  input: Requirement.input({
    calendar: TargetObject(Calendar), // or a neutral Feed/Events kind to avoid the type dep
    range: DateRange,
  }),
  output: Trip,
});
```

### 3. Host side — resolvers fulfill kinds for a node

A host contributes `RequirementResolver` capabilities keyed by kind. inbox provides a `DateRange`
resolver for `Calendar` nodes that reads its _own_ current selection (local state — no exported key, no
shared ViewState contract):

```ts
RequirementResolver.make({
  kind: DateRange,
  match: (node) => Calendar.is(node.data),
  resolve: (node, ctx) => Effect.succeed(currentRangeFor(node, ctx)),
});
```

### 4. Framework broker

When building actions for a node, the broker:

1. Finds operations whose `target` matches the node's type (as today, via the app graph).
2. For each, checks every requirement kind has a matching resolver on that node. **Only fully-satisfiable
   operations are surfaced** — automatic menu gating.
3. On invocation, runs the resolvers, assembles a **self-describing payload** (`{ kind, value }[]`
   validated against each requirement schema), and calls `Operation.invoke(op, payload)`.

### Self-describing payload

Each value carries its kind, so an opaque/remote provider can introspect and validate without knowing
the host:

```ts
{ requirements: [
  { kind: 'dxos.org/requirement/object', value: <Ref> },
  { kind: 'dxos.org/requirement/date-range', value: { from, to } },
]}
```

## Why this is better

| Concern         | Today                            | With contracts                                          |
| --------------- | -------------------------------- | ------------------------------------------------------- |
| Coupling        | trip imports inbox's key helper  | both depend only on the neutral kind registry           |
| Caller          | provider reaches into host state | host fulfills declared needs; provider stays pure       |
| Remote          | breaks (no ViewState access)     | payload is serializable + self-describing → remote-safe |
| Menu visibility | offered even if unsatisfiable    | gated on resolver availability                          |
| Validation      | ad-hoc, at call time             | schema-validated before invoke                          |

## Generality — what else is a "requirement"?

The same broker covers most cross-plugin context-passing. Examples:

| Kind                               | Host that resolves it        | Operations that consume it                     |
| ---------------------------------- | ---------------------------- | ---------------------------------------------- |
| `DateRange`                        | calendar, timeline           | plan trip, export range, schedule digest       |
| `TargetObject(T)` / `ObjectSet(T)` | any selection, list, navtree | summarize, add-to-collection, relate, delete   |
| `TextRange`                        | editor                       | translate, create-task-from-selection, comment |
| `GeoPoint` / `GeoBounds`           | map                          | find-nearby, plan-route, weather               |
| `Selection`                        | any attention surface        | generic "act on selection"                     |
| `Query` / `Filter`                 | saved filters, search        | subscribe, materialize, share                  |
| `Blob` / `FileRef`                 | files, video                 | transcribe, extract, OCR                       |
| `Space` / `Identity`               | layout / client              | scope, invite, share                           |

These are exactly the ad-hoc channels DXOS already uses (companion surfaces, `ViewState` selection
aspects, the OSRM `PlanRoute` flow) — unified into one typed contract.

## Elegant fallback: requirements double as form specs

When a requirement has **no** resolver on the node (or resolution returns nothing), the framework can
render a schema-driven `Form` from the requirement's Effect Schema to ask the user — reusing the existing
`@dxos/react-ui-form` machinery. So a requirement is both an _auto-resolution contract_ and a
_form-generation spec_: auto-fill when the host can, prompt when it can't. This subsumes today's
operation-input dialogs.

## Relationship to existing primitives

- **`Operation` input schema** — requirements are an annotation layer over input fields (a
  `RequirementAnnotation` carrying the kind), so the handler signature is unchanged.
- **`AppGraphBuilder`** — still how operations target node types; the broker adds the
  resolver-satisfiability check + payload assembly.
- **`AppCapabilities`** — `RequirementResolver` is a new contributed capability key (host side);
  requirement kinds register like schemas.
- **`ViewState`/attention** — becomes _one possible resolver implementation_ (a selection resolver),
  not the transport.

## Scope / migration

First concrete case (replaces the `getCalendarRangeSelectionId` coupling):

1. Define `DateRange` (and a neutral events/feed target kind, to avoid trip↔inbox type cycle) in
   `@dxos/app-toolkit`.
2. trip's `PlanTrip` declares `{ target, range }` requirements; handler reads them from input.
3. inbox contributes `DateRange` + target resolvers for `Calendar` nodes; delete
   `getCalendarRangeSelectionId` and the `ViewState` round-trip.
4. Broker gates the menu item on resolver availability.

This is independent of the plugin-inbox shared-components PR (#11832) and should be its own change.

## Open questions

- **Kind registry location & versioning** — `@dxos/app-toolkit` vs a dedicated `@dxos/requirements`;
  how kinds version (schema evolution).
- **Reactivity of gating** — resolver `match` must be cheap/sync for menu building; expensive checks
  need a declared-capability hint, not live resolution.
- **Multiplicity & ambiguity** — when several resolvers match one kind on a node (which wins? user
  picks?).
- **Async resolution UX** — resolve-on-open vs resolve-on-invoke; spinner/disable semantics.
- **Type-cycle avoidance** — does `TargetObject(Calendar)` reintroduce trip→inbox? Prefer a structural
  kind (feed + events) over the concrete `Calendar` type for the provider's declaration.
- **Trust** — for remote providers, does the host need to vet the requirement kinds it fulfills?

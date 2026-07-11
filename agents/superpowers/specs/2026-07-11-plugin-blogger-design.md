# plugin-blogger — Design

Date: 2026-07-11
Status: Awaiting user approval; navtree sourcing deferred (see Open questions).

## Purpose

A Composer plugin for authoring blog posts with the assistance of the agent.
An author organises work into **Publications** (a named collection with base
agent instructions) that contain **Posts**. Each Post has a planning **outline**
and one or more **Drafts** (versions), each an independently commentable markdown
document.

## Scope (Phase 1)

Two plugins:

- **`plugin-blogger`** — the authoring plugin: full vertical slice (schema →
  operations → capabilities (create-object, app-graph, react-surface) →
  components (`PublicationArticle`, `PostArticle`, `PostCard`) → translations →
  storybook → tests). Also defines a provider-agnostic **publisher** capability
  contract and the push/pull sync operations that consume it.
- **`plugin-typefully`** — implements the publisher capability against the
  Typefully REST API, authenticating via a `plugin-connector` `Connection`.

Both verified in storybook.

This design doc drives the Phase 1 build. **At the close of Phase 1, before the
PR, author `PLUGIN.mdl` for each plugin** (`packages/plugins/plugin-blogger/PLUGIN.mdl`
and `packages/plugins/plugin-typefully/PLUGIN.mdl`) from this doc and the as-built
plugins — the durable specs consumed by subsequent sessions (per the
`composer-plugins` skill).

Phase 2 (agent skills/operations for ideate/draft/publish) is discussed
separately and is **not** built here.

## Data model (`src/types/`)

All editable document slots reuse `Markdown.Document` from
`@dxos/plugin-markdown`. This gives each slot the full markdown editor surface
and makes the comments plugin attach automatically (comments anchor to
`Markdown.Document` subjects via an `AnchoredTo` relation — no extra wiring).

### `Publication`
```
name:         string (label)
instructions: Ref<Markdown.Document>          // base instructions for the assistant agent
posts:        Schema.Array(Ref<Post>)
```

### `Post`
```
name:    string (title, label)
summary: string (optional; shown on PostCard)
outline: Ref<Markdown.Document>               // planning / ideas / notes
drafts:  Schema.Array(Ref<Draft>)             // versions, order = version order
```

### `Draft` (wrapper object so versions carry metadata)
```
label:     string (optional; e.g. "Draft 1")
createdAt: string (ISO timestamp)
content:   Ref<Markdown.Document>             // the draft body (commentable)
```

`make()` factories construct child docs with `Ref.make(Markdown.make(...))` and
call `Obj.setParent(child, parent)` so docs are owned by their container (mirrors
`Markdown.make`). Newest draft (last in array) is selected by default in the UI.

## Operations (`src/operations/`, per the `operations` skill)

`BloggerOperation`:
- **`AddPublication`** — create a `Publication` (+ empty instructions doc).
- **`AddPost`** — create a `Post` (+ outline doc + an initial `Draft`), push onto
  `Publication.posts`.
- **`AddDraft`** — create a `Draft` (+ `Markdown.Document`), push onto
  `Post.drafts`, and select it.
- **`PublishDraft`** — push a local `Draft` to the selected publisher: resolve the
  `PublisherService` (by id/source), call `createDraft` (or `updateDraft` when the
  Draft already carries a foreign key for that source), and record the returned
  external id as an ECHO foreign key on the Draft (`Obj.setKeys`, keyed by the
  publisher `source`).
- **`ImportDrafts`** — pull from a publisher: `listDrafts` (+ `getDraft` for
  bodies) and materialize/reconcile local `Draft`s, matching by foreign key.
- **`UnpublishDraft`** — `deleteDraft` on the publisher and drop the foreign key.

## Publishing & external sync (provider-agnostic capability)

### Contract — `plugin-blogger/src/types/` (exposed via the `./types` subpath)
Modelled on `plugin-trip`'s `RoutingService` (plain TS interface + Effect schemas,
**not** ECHO objects), consumed like `plugin-osrm`.

- **`Publisher.PublisherDraft`** (Effect `Schema.Struct`, provider-neutral DTO) —
  `{ id, text, title?, status?, scheduledAt?, url? }`.
- **`Publisher.PublisherService`** (interface):
  ```
  id: string; label: string; source: string;   // source e.g. 'typefully.com'
  listDrafts(connection: Ref<Connection>): Promise<PublisherDraft[]>
  getDraft(connection, id): Promise<PublisherDraft>
  createDraft(connection, input): Promise<PublisherDraft>
  updateDraft(connection, id, input): Promise<PublisherDraft>
  deleteDraft(connection, id): Promise<void>
  ```
  Every method takes a `Ref<Connection>` (from `@dxos/plugin-connector`) — the
  provider-neutral credential handle. **Token resolution lives entirely in the
  implementing plugin**; blogger never reads secrets.
- **Errors** — `Publisher.PublisherError`, `Publisher.MissingCredentialError`.
- **`BloggerCapabilities.PublisherService`** —
  `Capability.make<Publisher.PublisherService>(\`${meta.id}.capability.publisher-service\`)`.
  Namespace-exported from `types/index.ts`; `package.json` gets a `./types`
  subpath and `moon.yml` a `--entryPoint=src/types/index.ts`.

Consumers resolve via `Capability.getAll(BloggerCapabilities.PublisherService)` in
operation handlers (pick by `id`/`source`) and `useCapabilities(...)` in
containers (for a publisher picker / empty state).

### `plugin-typefully` (new plugin)
Depends on `@dxos/plugin-blogger` (for the capability key + types),
`@dxos/plugin-connector`, `@dxos/types`.

- **`capabilities/connector.ts`** — contributes a `ConnectorEntry`
  (`id: 'typefully'`, `source: 'typefully.com'`) with a **`credentialForm`**
  (non-OAuth API-key flow): a schema for the API key, `onSubmit` builds
  `AccessToken.make({ source: 'typefully.com', token })` + a `Connection` and
  returns `{ kind: 'complete', accessToken, connection }`. Activated on
  `AppActivationEvents.SetupConnectors`.
- **`capabilities/publisher-service.ts`** — contributes
  `BloggerCapabilities.PublisherService` implemented against the Typefully REST
  API. Each method builds an Effect program: `Database.load(connection)` →
  `Database.load(connection.accessToken)` → HTTP call with the Typefully auth
  header (`X-API-KEY` — **verify against current Typefully docs during
  implementation**) via `HttpClient` + `FetchHttpClient.layer`, then
  `Effect.runPromise`. Mirrors `plugin-linear/src/services/linear-api.ts`
  (`Credentials.fromConnection`, `withAuth`, decode with `Schema.decodeUnknown`,
  timeout + retry). Draft body markdown maps to Typefully draft `text`.
- Standard plugin scaffold (`meta.ts`, `TypefullyPlugin.tsx`, `plugin.ts`,
  `translations.ts`, `index.ts`). No article surfaces of its own in Phase 1.

## Capabilities

### `capabilities/create-object.ts`
`SpaceCapabilities.CreateObjectEntry` for `Publication` and `Post`. `Draft` is
created only via `AddDraft` from within `PostArticle` (no top-level create entry).

### `capabilities/app-graph-builder.ts`
A single **global** top-level **"Publications"** branch node contributed via
`GraphBuilder.createExtension` + `AppCapabilities.AppGraphBuilder`:
- Children = `Publication` objects.
- Each `Publication` node expands to its `Post` children
  (`NodeMatcher.whenNodeType(Publication)` connector).
- Create-actions: `+ Publication` on the root, `+ Post` on each Publication.

**Deferred:** where the global root sources its `Publication` objects (default
space query vs. all-spaces aggregation). Written so this is a localized change.
See Open questions.

### `capabilities/react-surface.tsx`
- `AppSurface.object(Article, Publication)` → **`PublicationArticle`**.
- `AppSurface.object(Article, Post)` → **`PostArticle`**.

## Components (`src/components/` + `src/containers/`)

Standard container layout: `Panel.Root` → `Panel.Toolbar asChild` (`Menu.Toolbar`
from a `MenuBuilder` action graph) → `Panel.Content asChild`. Presentation-only
pieces (`PostCard`, the masonry wrapper) live in `components/`; capability-using
surfaces (`PublicationArticle`, `PostArticle`) live in `containers/`.

### `PublicationArticle` (container)
- Toolbar **toggles the view** between two modes (full swap, not a stacked
  panel):
  1. **Gallery** (default) — a `Masonry` (`@dxos/react-ui-masonry`,
     `Masonry.Root`/`Content`/`Viewport`) of `PostCard` tiles, one per Post.
  2. **Instructions** — the Publication `instructions` markdown editor
     (delegated to the markdown editor `Surface`).
- Toolbar also has `+ Post`.

### `PostArticle` (container)
- Top: the **outline** doc, delegated to the markdown editor `Surface`.
- Toolbar: **one tab button per draft** + a `+` **new-draft** button
  (`MenuBuilder`, `disposition: 'toolbar'`). Selecting a tab sets the current
  draft. Plus a **Publish/Sync** action (invokes `PublishDraft`) and an **Import**
  action (invokes `ImportDrafts`), each targeting the selected publisher +
  `Connection`; disabled when no publisher/connection is available.
- Below: the **selected draft** body, delegated to the markdown editor `Surface`
  (comments work automatically).

### `PostCard` (component)
Summary tile: title, `summary` excerpt, draft count, updated time. Rendered
directly as the Masonry `Tile`.

## Rendering delegation

Outline / instructions / draft bodies are rendered by embedding a `Surface` for
the referenced `Markdown.Document` (reusing plugin-markdown's editor) rather than
re-implementing an editor. This is what keeps comments and editor behaviour
consistent.

## Plugin wiring

`meta.ts`, `BloggerPlugin.tsx` (contributes the capability modules via
`AppPlugin.add*Module`), `plugin.ts` (`Plugin.lazy`), `translations.ts`, barrels
`index.ts` / `types/index.ts`. Two-entrypoint rule: `index.ts` exports only meta
+ types/operations, never the plugin instance. Register with `composer-app`.

## Dependencies

**`plugin-blogger`:** `@dxos/plugin-markdown`, `@dxos/react-ui-masonry`,
`@dxos/react-ui-menu`, `@dxos/plugin-connector` (the `Connection` type for the
publisher contract), plus the standard set: `@dxos/app-framework`,
`@dxos/app-toolkit`, `@dxos/echo`, `@dxos/schema`, `@dxos/compute`,
`@dxos/plugin-space`, `@dxos/plugin-graph`, `@dxos/plugin-client`,
`@dxos/react-ui`, `@dxos/ui-theme`.

**`plugin-typefully`:** `@dxos/plugin-blogger` (`./types`), `@dxos/plugin-connector`,
`@dxos/types`, `@dxos/echo`, `@dxos/compute`, `@effect/platform` (HttpClient /
FetchHttpClient), plus the standard app-framework set.

All in-repo deps use `workspace:*`; both packages set `"private": true`.

## Testing

- Schema `make` tests (refs resolve, parent set, defaults).
- Operation tests (`AddPost` creates outline + initial draft; `AddDraft` appends
  and selects). `PublishDraft`/`ImportDrafts` tested against a **stub
  `PublisherService`** contributed into the test capability set — asserts
  create-vs-update selection, foreign-key write on push, and dedup-by-foreign-key
  on pull. No live Typefully calls.
- `plugin-typefully`: unit-test the service against a mocked HTTP layer
  (`Schema.decodeUnknown` of canned responses; assert the `X-API-KEY` header and
  endpoint/method per verb), plus a connector `credentialForm.onSubmit` test
  (builds `AccessToken` + `Connection`). Mirrors `plugin-chess-com`/`plugin-linear`
  HTTP test style.
- `BloggerPlugin.test.ts` / `TypefullyPlugin.test.ts` (plugins load, capabilities
  contribute).
- Storybook stories for `PublicationArticle` / `PostArticle` / `PostCard`, with
  ECHO factories inside `useMemo([], ...)` in a `render` function (never
  module-level story `args`). Verified on a non-9009 storybook port.

## Naming

`PublicationArticle` (singular; article for one Publication), `PostArticle`,
`PostCard`. (`PublicationsArticle` in the original request → `PublicationArticle`.)

## Open questions

1. **Navtree sourcing** (deferred): default-space `Filter` query vs. all-spaces
   aggregation for the global "Publications" root's children. Phase-1 code will
   localize this so the choice can be made when wiring the graph.
2. **Connection selection UX** (deferred): how the author picks which publisher +
   `Connection` a Publish/Import action targets — implicit "first matching
   connection", a per-Publication default, or an explicit picker. Phase-1 wires
   the operations to take an explicit connection ref; the UI can start with
   first-match and grow a picker later.
3. **Typefully auth header + endpoint set** — confirm `X-API-KEY` vs `Bearer` and
   the exact draft CRUD endpoints against current Typefully API docs during
   implementation (the MCP tool surface implies create/get/list/edit/delete).

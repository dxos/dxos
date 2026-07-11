# plugin-blogger + plugin-typefully Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `plugin-blogger` for authoring blog posts (Publications → Posts → Drafts, each a commentable markdown doc) with a global "Publications" navtree root, plus a `plugin-typefully` that syncs drafts to Typefully via a provider-agnostic publisher capability.

**Architecture:** `plugin-blogger` owns ECHO schema (`Publication`/`Post`/`Draft`), operations, a global app-graph root, and article/card surfaces; it defines a provider-neutral `PublisherService` capability contract (`./types`). `plugin-typefully` implements that contract against the Typefully REST API, reading credentials from a `plugin-connector` `Connection`. Editable docs reuse `Markdown.Document` so the comments plugin and markdown editor work for free.

**Tech Stack:** TypeScript, Effect-TS, `@dxos/echo`, `@dxos/app-framework`/`@dxos/app-toolkit`, `@dxos/react-ui*`, `@effect/platform` HttpClient, moon, vitest, storybook.

**Design doc:** [agents/superpowers/specs/2026-07-11-plugin-blogger-design.md](../specs/2026-07-11-plugin-blogger-design.md)

## Global Constraints

- New packages MUST set `"private": true`. In-repo deps use `workspace:*` (never catalog); external deps use `catalog:`.
- No casts to silence the type-checker (`as any`, `as unknown as T`, non-null `!`). Fix types at the source. `as const` is fine.
- Two-entrypoint rule: `src/index.ts` exports only `meta` + types/operations, NEVER the plugin instance. `src/plugin.ts` holds `Plugin.lazy()` (the `./plugin` subpath).
- `src/components/` must NOT import `@dxos/app-framework`/`@dxos/app-toolkit`; capability-using code lives in `src/containers/`.
- Named exports only (except container `index.ts` default bridges for `React.lazy`). Barrel/`#`-alias imports, not deep relative paths.
- Single quotes; import groups builtin → external → @dxos → internal → parent → sibling. Prefer `#private`, `invariant` over thrown preconditions.
- Format with `pnpm format` (oxfmt); CI checks `oxfmt --check`. Lint: `moon run <pkg>:lint -- --fix`.
- Every ECHO interface reactive in UI (`useQuery`/`useObject`). ECHO factories in stories go in `useMemo([], …)` in a `render` fn — never module-level `args`.
- Exemplars to copy structure from: `packages/plugins/plugin-chess` (plugin shape), `plugin-gallery` (masonry article), `plugin-inbox` (create-object, app-graph root), `plugin-trip`/`plugin-osrm` (Service capability), `plugin-linear` (connector + HTTP), `plugin-chess-com` (HTTP operation + foreign keys).
- Storybook: reuse the user's server on :9009 if running (curl check), else start on a DIFFERENT `--port`; never kill theirs. Run storybook from inside this worktree dir.
- `pnpm install` in this repo: `HUSKY=0 pnpm install --no-frozen-lockfile` (plain install fails frozen-lockfile). New workspace dep also needs a hand-added `references` entry in the consuming `tsconfig.json`.

---

## File Structure

```
packages/plugins/plugin-blogger/
  package.json  moon.yml  README.md  tsconfig.json  vitest.config.ts  dx.config.ts  LICENSE
  src/
    index.ts                      # exports meta + types + operations (NOT the plugin)
    plugin.ts                     # Plugin.lazy wrapper + re-export OperationHandlerSet
    meta.ts                       # Plugin.Meta
    translations.ts
    BloggerPlugin.tsx             # Plugin.define(meta).pipe(...)  + export default
    types/
      index.ts                    # export * as Blogger / Publisher / BloggerCapabilities
      Blogger.ts                  # Publication, Post, Draft ECHO types + make()
      Publisher.ts                # provider-neutral PublisherService iface + DTO + errors
      BloggerCapabilities.ts      # Capability.make<PublisherService>()
    operations/
      index.ts                    # definitions + lazy OperationHandlerSet
      definitions.ts              # BloggerOperation.* Operation.make()
      add-publication.ts add-post.ts add-draft.ts
      publish-draft.ts import-drafts.ts unpublish-draft.ts
    capabilities/
      index.ts                    # Capability.lazy barrels
      create-object.ts app-graph-builder.ts react-surface.tsx
    components/
      index.ts
      PostCard/{index.ts,PostCard.tsx,PostCard.stories.tsx}
    containers/
      index.ts
      PublicationArticle/{index.ts,PublicationArticle.tsx,PublicationArticle.stories.tsx}
      PostArticle/{index.ts,PostArticle.tsx,PostArticle.stories.tsx}

packages/plugins/plugin-typefully/
  package.json moon.yml README.md tsconfig.json vitest.config.ts dx.config.ts LICENSE
  src/
    index.ts plugin.ts meta.ts translations.ts TypefullyPlugin.tsx
    capabilities/{index.ts,connector.ts,publisher-service.ts}
    services/{index.ts,typefully-api.ts}   # TypefullyCredentials + HTTP client
```

---

## Task 1: Scaffold plugin-blogger (buildable skeleton)

**Files:**
- Create: all `packages/plugins/plugin-blogger/` root files + minimal `src/{meta,translations,plugin,index,BloggerPlugin}.ts(x)`, `src/capabilities/{index.ts,react-surface.tsx}`, `src/containers/{index.ts}`, one placeholder container, `src/components/index.ts`, `src/types/index.ts`.

**Interfaces:**
- Produces: `meta` (`org.dxos.plugin.blogger`), `BloggerPlugin` (lazy), buildable package `@dxos/plugin-blogger`.

- [ ] **Step 1: Copy the exemplar structure.** Copy `packages/plugins/plugin-chess`'s root files (`package.json`, `moon.yml`, `tsconfig.json`, `vitest.config.ts`, `dx.config.ts`, `LICENSE`, `README.md`) into `packages/plugins/plugin-blogger`. In `package.json` set `"name": "@dxos/plugin-blogger"`, `"private": true`, `"description": "Author blog posts with agent assistance."`, keep the `#*` import aliases + `.`/`./plugin`/`./types`/`./translations` export subpaths. Replace chess-specific deps; dependencies must include: `@dxos/app-framework`, `@dxos/app-toolkit`, `@dxos/compute`, `@dxos/echo`, `@dxos/keys`, `@dxos/plugin-client`, `@dxos/plugin-space`, `@dxos/plugin-graph`, `@dxos/plugin-markdown`, `@dxos/plugin-connector`, `@dxos/react-ui`, `@dxos/react-ui-menu`, `@dxos/react-ui-masonry`, `@dxos/schema`, `@dxos/util`, `effect` (catalog). devDeps: `@dxos/plugin-testing`, `@dxos/plugin-preview`, `@dxos/storybook-utils`, `@dxos/ui-theme`, `@types/react`, `@types/react-dom`, `react`, `react-dom`, `vite`.

- [ ] **Step 2: moon.yml entrypoints.** Ensure the `compile` task `args` list has `--entryPoint` for each of: `src/index.ts`, `src/plugin.ts`, `src/types/index.ts`, `src/capabilities/index.ts`, `src/containers/index.ts`, `src/operations/index.ts`. Mirror `plugin-chess/moon.yml` + `plugin-trip/moon.yml:25` (the types entry).

- [ ] **Step 3: meta.ts**

```ts
import { type Plugin } from '@dxos/app-framework';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.blogger',
  name: 'Blogger',
  description: 'Author blog posts with agent assistance.',
  icon: 'ph--pen-nib--regular',
  iconHue: 'amber',
};
```

- [ ] **Step 4: minimal translations.ts, index.ts, plugin.ts, BloggerPlugin.tsx.** Mirror `plugin-chess` exactly, substituting names. `index.ts` exports `meta` only for now (types/operations added later — NEVER the plugin). `plugin.ts`: `export const BloggerPlugin = Plugin.lazy(meta, () => import('#plugin'));`. `BloggerPlugin.tsx`: `Plugin.define(meta).pipe(AppPlugin.addTranslationsModule({ translations }), AppPlugin.addSurfaceModule({ activate: ReactSurface }))` + `export default BloggerPlugin`. Add a placeholder `react-surface.tsx` contributing an empty `Capabilities.ReactSurface` array and `capabilities/index.ts` with `export const ReactSurface = Capability.lazy('BloggerReactSurface', () => import('./react-surface'));`.

- [ ] **Step 5: install + build + lint.**

Run: `HUSKY=0 pnpm install --no-frozen-lockfile` then `moon run plugin-blogger:build && moon run plugin-blogger:lint`
Expected: build + lint PASS (no surfaces yet is fine). If build errors "Could not resolve", a `--entryPoint` is missing from moon.yml.

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/plugin-blogger pnpm-lock.yaml
git commit -m "feat(plugin-blogger): scaffold plugin skeleton"
```

---

## Task 2: ECHO schema — Publication, Post, Draft

**Files:**
- Create: `src/types/Blogger.ts`, `src/types/index.ts` (namespace re-export), `src/types/Blogger.test.ts`.

**Interfaces:**
- Produces: `Blogger.Publication`, `Blogger.Post`, `Blogger.Draft` classes; factories `Blogger.makePublication(props)`, `Blogger.makePost(props)`, `Blogger.makeDraft(props)`. Ref shapes: `Publication.posts: Ref.Ref<Post>[]`, `Publication.instructions: Ref.Ref<Markdown.Document>`, `Post.outline: Ref.Ref<Markdown.Document>`, `Post.drafts: Ref.Ref<Draft>[]`, `Draft.content: Ref.Ref<Markdown.Document>`.

- [ ] **Step 1: Write the failing test** — `src/types/Blogger.test.ts`

```ts
import { describe, expect, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';
import { Markdown } from '@dxos/plugin-markdown';

import { Blogger } from './index';

describe('Blogger schema', () => {
  test('makeDraft wraps a markdown document owned by the draft', () => {
    const draft = Blogger.makeDraft({ label: 'Draft 1', createdAt: '2026-07-11T00:00:00Z' });
    expect(Obj.instanceOf(Blogger.Draft, draft)).toBe(true);
    expect(Obj.instanceOf(Markdown.Document, draft.content.target!)).toBe(true);
    expect(Obj.getParent(draft.content.target!)).toBe(draft);
  });

  test('makePost creates outline + one initial draft', () => {
    const post = Blogger.makePost({ name: 'Hello' });
    expect(post.name).toBe('Hello');
    expect(Obj.instanceOf(Markdown.Document, post.outline.target!)).toBe(true);
    expect(post.drafts).toHaveLength(1);
    expect(Obj.instanceOf(Blogger.Draft, post.drafts[0].target!)).toBe(true);
  });

  test('makePublication holds instructions + empty posts', () => {
    const publication = Blogger.makePublication({ name: 'Blog' });
    expect(Obj.instanceOf(Markdown.Document, publication.instructions.target!)).toBe(true);
    expect(publication.posts).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `moon run plugin-blogger:test -- src/types/Blogger.test.ts`
Expected: FAIL — `Blogger` has no `makeDraft`/`Draft` exports.

- [ ] **Step 3: Implement `src/types/Blogger.ts`**

```ts
import { Schema } from 'effect';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { Markdown } from '@dxos/plugin-markdown';

// A single version of a post; wraps a commentable markdown document.
export class Draft extends Type.makeObject<Draft>(DXN.make('org.dxos.type.blogger.draft', '0.1.0'))(
  Schema.Struct({
    label: Schema.optional(Schema.String),
    createdAt: Schema.optional(Schema.String),
    content: Ref.Ref(Markdown.Document).pipe(FormInputAnnotation.set(false)),
  }).pipe(LabelAnnotation.set(['label'])),
) {}

// A blog post: a planning outline plus ordered drafts (versions).
export class Post extends Type.makeObject<Post>(DXN.make('org.dxos.type.blogger.post', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    summary: Schema.optional(Schema.String),
    outline: Ref.Ref(Markdown.Document).pipe(FormInputAnnotation.set(false)),
    drafts: Schema.Array(Ref.Ref(Draft)).pipe(FormInputAnnotation.set(false), Schema.optional),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--article--regular', hue: 'amber' }),
  ),
) {}

// A collection of posts with shared base instructions for the assistant agent.
export class Publication extends Type.makeObject<Publication>(
  DXN.make('org.dxos.type.blogger.publication', '0.1.0'),
)(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    instructions: Ref.Ref(Markdown.Document).pipe(FormInputAnnotation.set(false)),
    posts: Schema.Array(Ref.Ref(Post)).pipe(FormInputAnnotation.set(false), Schema.optional),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--books--regular', hue: 'amber' }),
  ),
) {}

// Build the child document and its ref BEFORE Obj.make (mirrors Markdown.make),
// then set parent ownership after — no casts, all required refs supplied at make.

export const makeDraft = ({ label, createdAt, content = '' }: { label?: string; createdAt?: string; content?: string } = {}): Draft => {
  const doc = Markdown.make({ content });
  const draft = Obj.make(Draft, { label, createdAt, content: Ref.make(doc) });
  Obj.setParent(doc, draft);
  return draft;
};

export const makePost = ({ name, summary }: { name?: string; summary?: string } = {}): Post => {
  const outline = Markdown.make({});
  const draft = makeDraft({ label: 'Draft 1' });
  const post = Obj.make(Post, { name, summary, outline: Ref.make(outline), drafts: [Ref.make(draft)] });
  Obj.setParent(outline, post);
  Obj.setParent(draft, post);
  return post;
};

export const makePublication = ({ name }: { name?: string } = {}): Publication => {
  const instructions = Markdown.make({});
  const publication = Obj.make(Publication, { name, instructions: Ref.make(instructions), posts: [] });
  Obj.setParent(instructions, publication);
  return publication;
};
```

> This mirrors `plugin-markdown/src/types/Markdown.ts` `make` (`Obj.make(Document, { content: Ref.make(Text.make(...)) })` then `Obj.setParent(doc.content.target!, doc)`). Verify `Markdown.make({})` accepts an empty arg for the outline/instructions docs; if it requires `{ content: '' }`, pass that. No casts anywhere — if `Obj.make` complains about `readonly`/optional array typing on `drafts`/`posts`, supply `[]`/the array directly as shown (it is provided at construction, not deferred).

- [ ] **Step 4: `src/types/index.ts`**

```ts
export * as Blogger from './Blogger';
export * as Publisher from './Publisher';
export * as BloggerCapabilities from './BloggerCapabilities';
```

(`Publisher`/`BloggerCapabilities` created in Task 3 — create empty stub files now returning nothing, or reorder so Task 3 precedes the barrel. Simplest: add those two exports in Task 3 and here export only `Blogger` for now.)

- [ ] **Step 5: Run tests to verify pass**

Run: `moon run plugin-blogger:test -- src/types/Blogger.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Register schema in the plugin.** In `BloggerPlugin.tsx` add `AppPlugin.addSchemaModule({ activate: () => Capability.contributes(AppCapabilities.Schema, [Blogger.Publication, Blogger.Post, Blogger.Draft]) })` (mirror `plugin-chess` schema module; extract to `capabilities/schema.ts` if chess does). Build + lint.

- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat(plugin-blogger): add Publication/Post/Draft schema"`

---

## Task 3: Publisher capability contract (`./types`)

**Files:**
- Create: `src/types/Publisher.ts`, `src/types/BloggerCapabilities.ts`; update `src/types/index.ts`; `src/types/Publisher.test.ts`.

**Interfaces:**
- Produces:
  - `Publisher.PublisherDraft` — Effect `Schema.Struct` `{ id: string; text: string; title?: string; status?: string; scheduledAt?: string; url?: string }` + `type PublisherDraft`.
  - `Publisher.PublisherDraftInput` — `{ text: string; title?: string; scheduledAt?: string }`.
  - `Publisher.PublisherService` interface: `{ readonly id: string; readonly label: string; readonly source: string; listDrafts(connection): Promise<PublisherDraft[]>; getDraft(connection, id): Promise<PublisherDraft>; createDraft(connection, input): Promise<PublisherDraft>; updateDraft(connection, id, input): Promise<PublisherDraft>; deleteDraft(connection, id): Promise<void> }` where `connection: Ref.Ref<Connection.Connection>`.
  - `Publisher.PublisherError`, `Publisher.MissingCredentialError` (plain `Error` subclasses).
  - `BloggerCapabilities.PublisherService = Capability.make<Publisher.PublisherService>(\`${meta.id}.capability.publisher-service\`)`.

- [ ] **Step 1: Write the failing test** — `src/types/Publisher.test.ts`

```ts
import { describe, expect, test } from 'vitest';
import { Schema } from 'effect';

import { Publisher } from './index';

describe('Publisher contract', () => {
  test('PublisherDraft decodes a minimal draft', () => {
    const draft = Schema.decodeUnknownSync(Publisher.PublisherDraft)({ id: 'abc', text: 'hello' });
    expect(draft.id).toBe('abc');
    expect(draft.text).toBe('hello');
  });

  test('PublisherError carries a message', () => {
    const error = new Publisher.PublisherError('nope');
    expect(error.message).toBe('nope');
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `moon run plugin-blogger:test -- src/types/Publisher.test.ts` → FAIL (no `Publisher.PublisherDraft`).

- [ ] **Step 3: Implement `src/types/Publisher.ts`**

```ts
import { Schema } from 'effect';

import { type Ref } from '@dxos/echo';
import { type Connection } from '@dxos/plugin-connector/types';

// Provider-neutral draft DTO exchanged across the publisher capability boundary.
// NOT an ECHO object — a plain Effect schema.
export const PublisherDraft = Schema.Struct({
  id: Schema.String,
  text: Schema.String,
  title: Schema.optional(Schema.String),
  status: Schema.optional(Schema.String),
  scheduledAt: Schema.optional(Schema.String),
  url: Schema.optional(Schema.String),
});
export type PublisherDraft = Schema.Schema.Type<typeof PublisherDraft>;

export type PublisherDraftInput = {
  text: string;
  title?: string;
  scheduledAt?: string;
};

// A publishing backend (e.g. Typefully). Implemented by a provider plugin and
// contributed under BloggerCapabilities.PublisherService. The connection ref is
// the provider-neutral credential handle; token resolution stays in the provider.
export interface PublisherService {
  readonly id: string;
  readonly label: string;
  readonly source: string; // matches AccessToken.source, e.g. 'typefully.com'.
  listDrafts(connection: Ref.Ref<Connection.Connection>): Promise<PublisherDraft[]>;
  getDraft(connection: Ref.Ref<Connection.Connection>, id: string): Promise<PublisherDraft>;
  createDraft(connection: Ref.Ref<Connection.Connection>, input: PublisherDraftInput): Promise<PublisherDraft>;
  updateDraft(
    connection: Ref.Ref<Connection.Connection>,
    id: string,
    input: PublisherDraftInput,
  ): Promise<PublisherDraft>;
  deleteDraft(connection: Ref.Ref<Connection.Connection>, id: string): Promise<void>;
}

export class PublisherError extends Error {}
export class MissingCredentialError extends PublisherError {}
```

> If `@dxos/plugin-connector/types` does not export `Connection`, verify the correct subpath via `plugin-connector/package.json` `exports` and its `src/types/index.ts` namespace export; import the `Connection` namespace from there. Add `@dxos/plugin-connector` to `plugin-blogger` deps (Task 1 already lists it) + a tsconfig `references` entry.

- [ ] **Step 4: Implement `src/types/BloggerCapabilities.ts`**

```ts
import { Capability } from '@dxos/app-framework';

import { meta } from '../meta';
import { type PublisherService } from './Publisher';

// Provider/consumer contract: a publishing backend contributes an implementation;
// plugin-blogger's sync operations consume all contributions.
export const PublisherService = Capability.make<PublisherService>(`${meta.id}.capability.publisher-service`);
```

> If the const name colliding with the imported type name trips a TS2395/merged-declaration error, use the inline-import-type form from MEMORY.md: `Capability.make<import('./Publisher').PublisherService>(...)` and drop the type import.

- [ ] **Step 5: Update `src/types/index.ts`** to export all three namespaces (as shown in Task 2 Step 4).

- [ ] **Step 6: Run tests + build** — `moon run plugin-blogger:test -- src/types/Publisher.test.ts && moon run plugin-blogger:build` → PASS.

- [ ] **Step 7: Commit** — `git commit -am "feat(plugin-blogger): define provider-agnostic PublisherService contract"`

---

## Task 4: Content operations — AddPublication, AddPost, AddDraft

**Files:**
- Create: `src/operations/definitions.ts`, `add-publication.ts`, `add-post.ts`, `add-draft.ts`, `index.ts`, `src/operations/operations.test.ts`.

**Interfaces:**
- Produces: `BloggerOperation.AddPublication` (`{ target }` → `Publication`), `BloggerOperation.AddPost` (`{ publication: Publication, target }` → `Post`), `BloggerOperation.AddDraft` (`{ post: Post }` → `Draft`). A lazy `OperationHandlerSet` re-exported from `plugin.ts`.
- Consumes: `Blogger.*` factories (Task 2); `SpaceOperation.AddObject` (`@dxos/plugin-space`).

- [ ] **Step 1: Write the failing test** — model on `plugin-chess`/`plugin-inbox` operation tests using `Operation.invoke` inside a test database layer (mirror an existing `*.test.ts` that invokes an AddObject-style op; copy its harness verbatim). Assert `AddDraft` appends a new `Draft` to `post.drafts` and its `content` is a `Markdown.Document`; `AddPost` pushes onto `publication.posts`.

```ts
// Harness: copy the Effect + test-database setup from
// packages/plugins/plugin-inbox/src/operations/*.test.ts (or plugin-chess-com/src/operations/sync-games.test.ts).
// Then:
test('AddDraft appends a draft to the post', async () => {
  // given a Post with one draft, invoke AddDraft, expect post.drafts.length === 2.
});
```

- [ ] **Step 2: Run to verify it fails** — `moon run plugin-blogger:test -- src/operations/operations.test.ts` → FAIL.

- [ ] **Step 3: Implement `definitions.ts`** (mirror `plugin-chess/src/operations/`), e.g.:

```ts
import { Schema } from 'effect';

import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';

import { Blogger } from '../types';
import { meta } from '../meta';

export const AddPublication = Operation.make({
  key: `${meta.id}/add-publication`,
  input: Schema.Struct({ name: Schema.optional(Schema.String) }),
  output: Type.Ref(Blogger.Publication),
});

export const AddPost = Operation.make({
  key: `${meta.id}/add-post`,
  input: Schema.Struct({ publication: Type.Ref(Blogger.Publication), name: Schema.optional(Schema.String) }),
  output: Type.Ref(Blogger.Post),
});

export const AddDraft = Operation.make({
  key: `${meta.id}/add-draft`,
  input: Schema.Struct({ post: Type.Ref(Blogger.Post) }),
  output: Type.Ref(Blogger.Draft),
});
```

> Verify the exact `Operation.make` field names (`key`/`meta`/`input`/`output`/`services`) against `plugin-chess/src/operations/definitions.ts` and the `operations` skill — adjust to match (the skill is authoritative on `Operation.make` shape).

- [ ] **Step 4: Implement each handler** (`add-publication.ts` etc.) as `export default Op.pipe(Operation.withHandler(...), Operation.opaqueHandler)` mirroring `plugin-trip/src/operations/add-segment.ts`. `AddPost`: `const post = Blogger.makePost({ name }); publication.posts.push(Ref.make(post));` inside `Obj.update`, then persist via `SpaceOperation.AddObject`. `AddDraft`: `const draft = Blogger.makeDraft({ label: \`Draft ${post.drafts.length + 1}\`, createdAt: <passed-in ISO> }); Obj.update(post, (p) => p.drafts.push(Ref.make(draft)));` — `createdAt` comes from the operation input or is omitted (Date.now is unavailable in some contexts; accept an optional `createdAt` input, default undefined).

- [ ] **Step 5: `operations/index.ts`** exports the definitions and a lazy `OperationHandlerSet` (mirror `plugin-chess/src/operations/index.ts`). Re-export `OperationHandlerSet` from `plugin.ts`. Wire `AppPlugin.addOperationHandlerModule({ activate: OperationHandler })` in `BloggerPlugin.tsx`.

- [ ] **Step 6: Run tests to verify pass** — PASS.

- [ ] **Step 7: Commit** — `git commit -am "feat(plugin-blogger): AddPublication/AddPost/AddDraft operations"`

---

## Task 5: Sync operations — PublishDraft, ImportDrafts, UnpublishDraft

**Files:**
- Create: `src/operations/publish-draft.ts`, `import-drafts.ts`, `unpublish-draft.ts`; extend `definitions.ts`, `index.ts`; `src/operations/sync.test.ts`.

**Interfaces:**
- Produces: `BloggerOperation.PublishDraft` (`{ draft: Draft, connection: Ref<Connection>, publisherId?: string }` → `Draft`), `ImportDrafts` (`{ post: Post, connection: Ref<Connection>, publisherId?: string }` → `Post`), `UnpublishDraft` (`{ draft: Draft, connection, publisherId? }` → `Draft`).
- Consumes: `BloggerCapabilities.PublisherService` via `Capability.getAll` (Task 3); `Obj.getKeys`/`Obj.setKeys` for foreign-key mapping; `Blogger.Draft` content doc text.

- [ ] **Step 1: Write the failing test with a STUB service** — `src/operations/sync.test.ts`. Contribute a fake `PublisherService` into the test capability set:

```ts
const calls: string[] = [];
const stub: Publisher.PublisherService = {
  id: 'stub', label: 'Stub', source: 'stub.test',
  listDrafts: async () => [{ id: 'x1', text: 'remote' }],
  getDraft: async (_c, id) => ({ id, text: 'remote body' }),
  createDraft: async (_c, input) => { calls.push('create'); return { id: 'new1', text: input.text }; },
  updateDraft: async (_c, id, input) => { calls.push('update'); return { id, text: input.text }; },
  deleteDraft: async () => { calls.push('delete'); },
};
// Provide Capability.contributes(BloggerCapabilities.PublisherService, stub) into the handler's capability set.
```

Assert: (a) `PublishDraft` on an unlinked draft calls `create` and writes a foreign key `Obj.getKeys(draft, 'stub.test')` containing `new1`; (b) `PublishDraft` on a draft already keyed `stub.test:new1` calls `update`; (c) `ImportDrafts` creates a local draft for a remote id not already present as a foreign key, and skips ids already linked; (d) `UnpublishDraft` calls `delete` and removes the foreign key.

> The exact way to provide a capability into an operation-handler test: copy the pattern from a plugin test that stubs a capability (see MEMORY.md 2026-07-07 "Stub AiService" + `plugin-trip` service resolution). If no direct precedent exists, test the handler's core logic via a NAMED export (e.g. `export const runPublishDraft = (service, draft, connection) => …`) invoked with the stub directly — mirror `runFactPipeline` precedent in MEMORY.md — and keep the Operation.withHandler wrapper thin.

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Implement the handlers.** Core logic (in a named helper, service injected):

```ts
// Foreign-key helpers keyed by the publisher's `source`.
const linkedId = (draft: Blogger.Draft, source: string): string | undefined =>
  Obj.getKeys(draft, source)[0]?.id;

const draftText = (draft: Blogger.Draft): string => draft.content.target?.content.target?.content ?? '';
```

- `PublishDraft`: resolve service (`services.find(s => s.id === publisherId) ?? services[0]`; fail `PublisherError` if none); `const id = linkedId(draft, service.source)`; if `id` → `updateDraft(connection, id, { text })` else `createDraft(connection, { text })` then `Obj.setKeys(draft, [{ source: service.source, id: result.id }])`. (Confirm the `Obj.setKeys`/foreign-key API against `plugin-chess-com` `getForeignKey`/`Obj.getKeys` usage — MEMORY.md 2026-07-05.)
- `ImportDrafts`: `const remote = await service.listDrafts(connection)`; for each remote draft whose id is not already a foreign key on any `post.drafts`, `getDraft` its body, `const draft = Blogger.makeDraft({...}); set content text; Obj.setKeys(draft, [{source, id}]); post.drafts.push(Ref.make(draft))` inside `Obj.update`.
- `UnpublishDraft`: `const id = linkedId(...)`; if present `await service.deleteDraft(connection, id)` and clear that foreign key.

Bridge Promises into Effect with `Effect.tryPromise` (mirror `plugin-trip/src/operations/plan-route.ts:50-53`). Set draft content text via `Obj.update(doc.content.target!, t => t.content = text)` — verify the Markdown.Document → Text content path.

- [ ] **Step 4: Register the 3 new definitions + handlers** in `definitions.ts`/`index.ts`.

- [ ] **Step 5: Run tests to verify pass** — PASS (4 assertions).

- [ ] **Step 6: Commit** — `git commit -am "feat(plugin-blogger): PublishDraft/ImportDrafts/UnpublishDraft sync operations"`

---

## Task 6: create-object capability

**Files:**
- Create: `src/capabilities/create-object.ts`; update `capabilities/index.ts`, `BloggerPlugin.tsx`; `src/capabilities/create-object.test.ts` (optional smoke).

**Interfaces:**
- Produces: `SpaceCapabilities.CreateObjectEntry` for `Blogger.Publication` and `Blogger.Post`.

- [ ] **Step 1: Implement** (mirror `plugin-inbox/src/capabilities/create-object.ts:19-73`):

```ts
import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { Effect } from 'effect';
import { SpaceCapabilities, SpaceOperation } from '@dxos/plugin-space';

import { BloggerOperation } from '../operations';
import { Blogger } from '../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Blogger.Publication),
        createObject: (props, options) =>
          Operation.invoke(BloggerOperation.AddPublication, { ...props, target: options.target }),
      }),
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Blogger.Post),
        createObject: (props, options) =>
          Operation.invoke(SpaceOperation.AddObject, {
            object: Blogger.makePost(props),
            target: options.target,
            targetNodeId: options.targetNodeId,
          }),
      }),
    ];
  }),
);
```

> `AddPublication` needs to accept `target` and persist via `SpaceOperation.AddObject` internally — confirm the `CreateObjectEntry.createObject` signature `(props, options) => Effect<...>` against `plugin-inbox`. Adjust field names to match.

- [ ] **Step 2: Wire** `Capability.lazy('BloggerCreateObject', …)` in `capabilities/index.ts` + `AppPlugin.addMetadataModule`/create-object registration in `BloggerPlugin.tsx` (mirror chess). Build + lint.

- [ ] **Step 3: Commit** — `git commit -am "feat(plugin-blogger): create-object entries for Publication/Post"`

---

## Task 7: Global "Publications" navtree root

**Files:**
- Create: `src/capabilities/app-graph-builder.ts`; update `capabilities/index.ts`, `BloggerPlugin.tsx`.

**Interfaces:**
- Produces: an `AppCapabilities.AppGraphBuilder` extension contributing a top-level branch node `blogger-publications` whose children are `Publication` objects, each expanding to its `Post` children; create-actions `+ Publication` (root) and `+ Post` (per Publication).

- [ ] **Step 1: Implement** using `GraphBuilder.createExtension` (mirror `plugin-inbox/src/capabilities/app-graph-builder.ts:161-292` for a branch node with inline child nodes + actions, and `plugin-brain` per MEMORY.md 2026-07-07 for `Effect.all([...])` assembly). The root connector sources `Publication` objects — **see Open Question 1**: implement a `getPublications()` seam that currently queries the default space (`client.spaces.default.db` `Filter.type(Blogger.Publication)`), isolated in one function so it can be widened to all-spaces later. Children connector matches `NodeMatcher.whenNodeType(<publication node type>)` and lists `post` children.

```ts
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({ id: `${meta.id}/root`, match: AppNodeMatcher.whenRoot, connector: /* returns the Publications branch node */ }),
      GraphBuilder.createExtension({ id: `${meta.id}/posts`, match: NodeMatcher.whenNodeType(PUBLICATION_NODE_TYPE), connector: /* lists Post children */ }),
    ]);
    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
```

> Fill in the connector bodies against the inbox reference (exact `Node.make`/`AppNode` calls, `role: 'branch'`, `Node.makeAction` with `disposition`). Create-actions invoke `BloggerOperation.AddPublication` / `AddPost`. Node label/icon from `meta` + `Blogger` icon annotations.

- [ ] **Step 2: Wire** `Capability.lazy` + `AppPlugin.addAppGraphModule({ activate: AppGraphBuilder })`. Build + lint.

- [ ] **Step 3: Manual/story verification deferred to Task 12.** Commit — `git commit -am "feat(plugin-blogger): global Publications navtree root"`

---

## Task 8: PostCard component (presentation)

**Files:**
- Create: `src/components/PostCard/{index.ts,PostCard.tsx,PostCard.stories.tsx}`, update `components/index.ts`.

**Interfaces:**
- Produces: `PostCard` — props `{ post: Blogger.Post; onClick?: () => void }`. No app-framework deps. Renders title, summary excerpt, draft count, and (if present) updated time using `Card.*` primitives from `@dxos/react-ui` (see composer-ui skill). Reactive via `useObject(post)`.

- [ ] **Step 1: Story-first.** Write `PostCard.stories.tsx` with an ECHO `Post` built in `useMemo([], () => Blogger.makePost({ name: 'Sample', summary: 'A summary' }))` inside a `render` fn; decorators `withTheme()` + translations. (Mirror `plugin-gallery` tile story / composer-ui guidance.)

- [ ] **Step 2: Implement `PostCard.tsx`** with `Card.StaticRoot`/`Card.Heading`/`Card.Text` (verify exact Card subcomponents in composer-ui skill). Draft count = `post.drafts?.length ?? 0`.

- [ ] **Step 3: Verify in storybook** (Task 12 batch) + `moon run plugin-blogger:lint`. Commit — `git commit -am "feat(plugin-blogger): PostCard component"`

---

## Task 9: PublicationArticle container (gallery ⇄ instructions toggle)

**Files:**
- Create: `src/containers/PublicationArticle/{index.ts,PublicationArticle.tsx,PublicationArticle.stories.tsx}`, update `containers/index.ts`.

**Interfaces:**
- Produces: `PublicationArticle` — props `AppSurface.ObjectArticleProps<Blogger.Publication>` (`{ subject, attendableId, role }`). A `Panel.Root` + `Menu.Toolbar` (MenuBuilder) with a **view toggle** (gallery/instructions) + **`+ Post`**. Gallery view = `Masonry.Root/Content/Viewport` of `PostCard` tiles (one per `subject.posts`); instructions view = `<Surface>` for `subject.instructions.target` (markdown editor). Reactive via `useObject(subject)`.
- Consumes: `PostCard` (Task 8); `BloggerOperation.AddPost` via `useOperationInvoker`; `Masonry` (`@dxos/react-ui-masonry`); `Menu`/`MenuBuilder`/`useMenuBuilder` (`@dxos/react-ui-menu`).

- [ ] **Step 1: Story-first** — build a `Publication` with 3 posts in `useMemo`, render inside `withPluginManager` (mirror `plugin-space` TypeCollectionArticle.stories per MEMORY.md 2026-07-03: `corePlugins()`, `StorybookPlugin`, `PreviewPlugin`, `ClientPlugin({ types: [Blogger.Publication, Blogger.Post, Blogger.Draft, Markdown.Document] })`, translations capability). Two stories: default (gallery) and a variant asserting the toggle swaps to instructions.

- [ ] **Step 2: Implement** using the `GalleryArticle` pattern (`plugin-gallery/src/containers/GalleryArticle/GalleryArticle.tsx:25-114`) for the Menu/Panel/Masonry shell; view mode via local `useState<'gallery'|'instructions'>`; the toggle is a MenuBuilder action flipping it. Masonry `Tile` = a memoized component rendering `<PostCard post={data.post} onClick={...} />`.

- [ ] **Step 3: Verify in storybook (Task 12)** + lint. Commit — `git commit -am "feat(plugin-blogger): PublicationArticle (gallery/instructions)"`

---

## Task 10: PostArticle container (outline + draft tabs + sync actions)

**Files:**
- Create: `src/containers/PostArticle/{index.ts,PostArticle.tsx,PostArticle.stories.tsx}`, update `containers/index.ts`.

**Interfaces:**
- Produces: `PostArticle` — props `AppSurface.ObjectArticleProps<Blogger.Post>`. Layout: `Panel.Root` → outline `<Surface>` (top) → `Panel.Toolbar` with a tab button per `subject.drafts` (MenuBuilder, `disposition:'toolbar'`) + `+` new-draft (invokes `AddDraft`) + Publish (invokes `PublishDraft`) + Import (invokes `ImportDrafts`) → selected draft `<Surface>` (below). Selected-draft index via local `useState`, defaulting to last.
- Consumes: `BloggerOperation.{AddDraft,PublishDraft,ImportDrafts}`; `useCapabilities(BloggerCapabilities.PublisherService)` (for enable/disable of Publish/Import + publisher label); markdown editor `Surface`.

- [ ] **Step 1: Story-first** — `Post` with 2 drafts in `useMemo`; `withPluginManager` incl. `MarkdownPlugin` (`@dxos/plugin-markdown`) so the editor `Surface` renders, plus a stub `PublisherService` capability so Publish/Import are enabled. Assert the two draft tabs render and switching changes the shown editor.

> Selecting the correct editor-surface role: render `<Surface role={AppSurface.Section} data={{ subject: draft.content.target }} />` (verify the role the markdown editor registers for — the `PreviewComponent`/MarkdownArticle uses `AppSurface.Section` for embeds; MEMORY.md 2026-06-30). Confirm and use the role that yields an editable editor in-story.

- [ ] **Step 2: Implement** the Panel/Menu shell (gallery-article pattern), draft tabs from `subject.drafts.map((_, i) => action(\`draft-${i}\`, { label: draft.label ?? \`Draft ${i+1}\`, disposition:'toolbar' }, () => setIndex(i)))`. Publish/Import actions disabled when `useCapabilities(BloggerCapabilities.PublisherService)` is empty; on click resolve a `Connection` (Open Question 2: first matching connection by `service.source`) and invoke the op.

- [ ] **Step 3: Verify in storybook (Task 12)** + lint. Commit — `git commit -am "feat(plugin-blogger): PostArticle (drafts + sync actions)"`

---

## Task 11: react-surface wiring + register with composer-app

**Files:**
- Modify: `src/capabilities/react-surface.tsx`, `src/containers/index.ts`; `packages/apps/composer-app/src/plugin-defs.tsx` (register `BloggerPlugin`).

**Interfaces:**
- Produces: surfaces `AppSurface.object(AppSurface.Article, Blogger.Publication)` → `PublicationArticle`, `AppSurface.object(AppSurface.Article, Blogger.Post)` → `PostArticle`.

- [ ] **Step 1: Implement react-surface.tsx** (mirror `plugin-inbox/src/capabilities/react-surface.tsx:67-75`). Import `AppSurface` from `@dxos/app-toolkit/ui` (NOT `@dxos/app-toolkit` — MEMORY.md 2026-07-07). Container lazy exports in `containers/index.ts` with `: ComponentType<any>`.

- [ ] **Step 2: Register the plugin** in `composer-app/src/plugin-defs.tsx` — add the import, the `getDefaults()` key entry, and the plugin-instantiation array entry (3 spots, per MEMORY.md 2026-07-09). Add `@dxos/plugin-blogger` to `composer-app/package.json` (`workspace:*`) + tsconfig references; `HUSKY=0 pnpm install --no-frozen-lockfile`.

- [ ] **Step 3: Build all touched** — `moon run plugin-blogger:build && moon run composer-app:build`. Commit — `git commit -am "feat(plugin-blogger): wire article surfaces + register with composer-app"`

---

## Task 12: Storybook verification pass (plugin-blogger)

- [ ] **Step 1:** Check for the user's storybook on :9009 (`curl -s localhost:9009/index.json`). If present, reuse; else `moon run storybook-react:serve` (or `pnpm exec storybook dev --port 9011 --no-open --ci` from `tools/storybook-react`), from INSIDE this worktree.
- [ ] **Step 2:** Load each story (`PostCard`, `PublicationArticle` default + toggle, `PostArticle`), screenshot, confirm no console errors. Fix issues at source, re-verify.
- [ ] **Step 3:** `MOON_CONCURRENCY=4 moon run plugin-blogger:test` + `moon run plugin-blogger:lint` + `pnpm format`. Commit any fixes.

---

## Task 13: Scaffold plugin-typefully

**Files:**
- Create: `packages/plugins/plugin-typefully/` root + `src/{meta,translations,plugin,index,TypefullyPlugin}.ts(x)`, `src/capabilities/index.ts`, `src/services/index.ts`.

**Interfaces:**
- Produces: `meta` (`org.dxos.plugin.typefully`), buildable `@dxos/plugin-typefully`.

- [ ] **Step 1:** Copy `plugin-chess` root files; `package.json` name `@dxos/plugin-typefully`, `"private": true`, deps: `@dxos/app-framework`, `@dxos/app-toolkit`, `@dxos/compute`, `@dxos/echo`, `@dxos/plugin-blogger` (`workspace:*`), `@dxos/plugin-connector`, `@dxos/types`, `@dxos/util`, `@effect/platform` (catalog), `effect` (catalog). moon.yml entrypoints for `src/index.ts`, `src/plugin.ts`, `src/capabilities/index.ts`, `src/services/index.ts`.
- [ ] **Step 2:** `meta.ts` (`id: 'org.dxos.plugin.typefully'`, `name: 'Typefully'`, `icon: 'ph--paper-plane-tilt--regular'`, `iconHue: 'sky'`), minimal `translations.ts`, `plugin.ts` (`Plugin.lazy`), `index.ts` (meta only), `TypefullyPlugin.tsx` (`Plugin.define(meta).pipe(AppPlugin.addTranslationsModule(...))` + `export default`).
- [ ] **Step 3:** `HUSKY=0 pnpm install --no-frozen-lockfile` + `moon run plugin-typefully:build && :lint`. Commit — `git commit -m "feat(plugin-typefully): scaffold plugin skeleton"`

---

## Task 14: Typefully connector (API-key credential form)

**Files:**
- Create: `src/capabilities/connector.ts`, update `capabilities/index.ts`, `TypefullyPlugin.tsx`; `src/capabilities/connector.test.ts`.

**Interfaces:**
- Produces: a `ConnectorEntry` (`id:'typefully'`, `source:'typefully.com'`) with a non-OAuth `credentialForm` whose `onSubmit` builds `AccessToken.make({ source:'typefully.com', token })` + a `Connection` and returns `{ kind:'complete', accessToken, connection }`. Activated on `AppActivationEvents.SetupConnectors`.

- [ ] **Step 1: Failing test** — assert `credentialForm.onSubmit({ apiKey: 'k' })` yields `kind:'complete'` with `accessToken.token === 'k'` and `accessToken.source === 'typefully.com'`. (Test the `onSubmit`/`credentialForm` object directly; no plugin manager.)
- [ ] **Step 2: Implement** mirroring `plugin-linear/src/capabilities/connector.ts:58-77`, using `credentialForm` (`plugin-connector/src/types/connector.ts:100-143`) instead of `oauth`. Schema for the key: `Schema.Struct({ apiKey: Schema.String })` with a label annotation. Import `AccessToken`, `Connection` from `@dxos/types` / `@dxos/plugin-connector/types` (verify subpaths).
- [ ] **Step 3: Wire** `Capability.lazy('TypefullyConnector', …)` + `Plugin.addModule({ activatesOn: AppActivationEvents.SetupConnectors, activate: Connector })` in `TypefullyPlugin.tsx` (mirror `LinearPlugin.ts:15-26`).
- [ ] **Step 4:** test PASS + build. Commit — `git commit -am "feat(plugin-typefully): connector with API-key credential form"`

---

## Task 15: Typefully PublisherService implementation

**Files:**
- Create: `src/services/typefully-api.ts`, `src/capabilities/publisher-service.ts`, update `capabilities/index.ts`, `services/index.ts`, `TypefullyPlugin.tsx`; `src/services/typefully-api.test.ts`.

**Interfaces:**
- Produces: `TypefullyCredentials` (Context.Tag with `fromConnection(ref)` → `{ token }`), a `makeTypefullyPublisherService(): Publisher.PublisherService`, and a capability contributing `BloggerCapabilities.PublisherService`.
- Consumes: `Publisher.PublisherService`/`PublisherDraft`/`PublisherDraftInput` + `BloggerCapabilities.PublisherService` from `@dxos/plugin-blogger/types`; `Connection`/`AccessToken`; `@effect/platform` HttpClient.

- [ ] **Step 1: Failing test** — mock the HTTP layer (provide a stub `HttpClient` layer returning canned JSON per route, mirror `plugin-linear`/`plugin-chess-com` HTTP test style) + a fake `Connection`/`AccessToken` in a test database. Assert: `createDraft` POSTs to the Typefully drafts endpoint with header `X-API-KEY: <token>` and decodes `{id,text}`; `listDrafts` GETs and returns an array; `deleteDraft` issues DELETE. Assert the auth header name/value.
- [ ] **Step 2: Implement `typefully-api.ts`** — `TypefullyCredentials extends Context.Tag(...)` with `fromConnection` (copy `linear-api.ts:109-122`, `Database.load(ref)` → `Database.load(connection.accessToken)` → `{ token: accessToken.token }`). A `typefullyRequest` helper yielding `HttpClient.HttpClient` + `TypefullyCredentials`, setting `X-API-KEY` (VERIFY against current Typefully API docs — Open Question 3; adjust to `Authorization: Bearer` if docs say so), decode with `Schema.decodeUnknown(PublisherDraft…)`, `Effect.timeout('15 seconds')` + retry (mirror `linear-api.ts:177-203`). `makeTypefullyPublisherService()` returns the interface; each method builds its Effect program and `Effect.runPromise(program.pipe(Effect.provide(FetchHttpClient.layer), Effect.provide(Database.layer(Obj.getDatabase(connection.target!))), Effect.provide(TypefullyCredentials.fromConnection(connection))))`.

> Endpoint map (confirm vs docs): create=POST `/v1/drafts/`, list=GET `/v1/drafts/`, get=GET `/v1/drafts/{id}/`, update=PATCH `/v1/drafts/{id}/`, delete=DELETE `/v1/drafts/{id}/`. Base `https://api.typefully.com`. Draft body markdown → request `content`; response `id` → `PublisherDraft.id`, response text/content → `PublisherDraft.text`.

- [ ] **Step 3: Implement `publisher-service.ts`** — `Capability.makeModule(() => { const service: Publisher.PublisherService = makeTypefullyPublisherService(); return Effect.succeed(Capability.contributes(BloggerCapabilities.PublisherService, service)); })` (mirror `plugin-osrm/src/capabilities/routing-service.ts:12-16`; explicit type annotation avoids TS2883). Lazy-register + `Plugin.addModule({ activatesOn: ActivationEvents.Startup, activate: PublisherService })`.
- [ ] **Step 4:** test PASS + build + lint. Commit — `git commit -am "feat(plugin-typefully): PublisherService over Typefully REST API"`

---

## Task 16: Register plugin-typefully with composer-app + integration check

- [ ] **Step 1:** Register `TypefullyPlugin` in `composer-app/src/plugin-defs.tsx` (3 spots) + dep + tsconfig ref + install.
- [ ] **Step 2:** `moon run plugin-typefully:build && moon run composer-app:build`.
- [ ] **Step 3:** Confirm the capability seam end-to-end via the blogger `sync.test.ts` stub still passes AND (if feasible) a story that loads both plugins shows Publish enabled. Commit — `git commit -am "feat(plugin-typefully): register with composer-app"`

---

## Task 17: Author PLUGIN.mdl for both plugins (pre-PR, REQUIRED)

**Files:**
- Create: `packages/plugins/plugin-blogger/PLUGIN.mdl`, `packages/plugins/plugin-typefully/PLUGIN.mdl`.

- [ ] **Step 1:** Using `packages/reflect/deus/lang/PLUGIN-.template.mdl` as the template and `packages/plugins/plugin-chess/PLUGIN.mdl` as a reference, write `plugin-blogger/PLUGIN.mdl`: `type` blocks (Publication, Post, Draft, PublisherDraft), `component` blocks (PublicationArticle, PostArticle, PostCard), `op` blocks (AddPublication, AddPost, AddDraft, PublishDraft, ImportDrafts, UnpublishDraft), a `service` block (PublisherService), `feat`/`req` blocks (Publications root, authoring, drafting, comments, publish/pull sync), and `test` acceptance blocks derived from the implemented behavior.
- [ ] **Step 2:** Write `plugin-typefully/PLUGIN.mdl`: the connector + PublisherService implementation, its `op`/`service` surface, and `feat`/`test` blocks for credential entry + each CRUD verb.
- [ ] **Step 3:** Commit — `git commit -am "docs(plugin-blogger): add PLUGIN.mdl specs for blogger + typefully"`

---

## Task 18: Full verification + PR

- [ ] **Step 1:** `MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism` for both packages; `moon run :lint -- --fix`; `pnpm format`.
- [ ] **Step 2:** Storybook pass green (Task 12) incl. the two-plugin publish-enabled story.
- [ ] **Step 3:** `git status` — account for every file incl. the user's edits + the corrected `composer-plugins` SKILL.md + the design/plan docs. Use the `submit-pr` skill; surface the Composer preview URL next to the PR link.

---

## Self-Review

- **Spec coverage:** Publication/Post/Draft schema (T2), outline+instructions docs (T2), comments-for-free via Markdown.Document (T2, inherent), global Publications root (T7), PublicationArticle gallery/instructions toggle (T9), PostArticle outline+draft tabs+new-draft (T10), PostCard summary (T8), create-object (T6), content ops (T4), publisher contract (T3), push+pull sync via foreign keys (T5), plugin-typefully connector+service (T14–T15), composer-app registration (T11,T16), PLUGIN.mdl (T17), tests+storybook throughout. All design-doc sections mapped.
- **Deferred (flagged, not gaps):** navtree sourcing (T7 seam), connection-selection UX (T10 first-match), Typefully auth header/endpoints (T15 verify-vs-docs).
- **Type consistency:** `PublisherService`/`PublisherDraft`/`PublisherDraftInput` names consistent T3→T5→T15; `makePublication/makePost/makeDraft` consistent T2→T4→T5; foreign-key `source` = `service.source` = `'typefully.com'` consistent T5↔T14↔T15.
- **Known verify-points (empirical, called out inline):** `Obj.make` deferred-ref ordering (T2 Step 3 note), `Operation.make` field names (T4), capability-in-test provisioning (T5), editor Surface role (T10), Typefully header+endpoints (T15). Each has a named fallback — no silent placeholder.

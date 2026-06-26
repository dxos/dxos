# CRX Page Actions M0+M1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **REQUIRED repo skills:** consult `composer-plugins` (and its `MEMORY.md`) before any plugin task, `composer-ui` before any container/component task, `operations` before any operation task. Search `mcp__dxos-introspect__list_idioms` before writing containers/capabilities/operations.

**Goal:** Merge plugin-extension into plugin-crx (M0), then build the page-action mechanism end-to-end with plugin-bookmarks as the first consumer (M1), per the approved spec at `docs/superpowers/specs/2026-06-09-crx-page-actions-design.md`.

**Architecture:** Plugins contribute `CrxCapabilities.PageAction` entries (serializable descriptor + live `Operation` definition). plugin-crx answers registry-list and invoke requests over window CustomEvents (same bridge style as clips). composer-crx caches descriptors in `chrome.storage.local`, shows matching actions in the popup, captures inputs via a bundled `snapshot` extractor, and delivers an invoke request to a Composer tab (auto-opening one if needed). plugin-bookmarks registers "Add bookmark" → `BookmarkOperation.AddFromSnapshot`.

**Tech stack:** effect Schema, `@dxos/operation`, app-framework capabilities, webextension-polyfill (MV3), vitest.

**Conventions locked in:**

- Page-action target operations take input `{ snapshot: PageAction.Snapshot, target: Database.Database }` and output `{ id: string }` (id of the created/affected object).
- Wire shapes are defined as effect Schemas in plugin-crx (`types/PageAction.ts`); composer-crx keeps hand-validated TS mirrors (same convention as Clip / search-proxy types). The extension has **no** `effect` dependency — extractor output is validated plugin-side by the operation input schema (deliberate deviation from spec §6's `outputSchema`-in-extension sketch).
- Labels in descriptors are plain resolved strings for M1 (i18n later).
- No settings gate on the invoke path for M1 (parity with the existing clip listener, which also doesn't gate).
- No context menus in M1 (M2 scope). `contexts` is carried in descriptors now so the wire shape doesn't change later.

**File map:**

```
M0:
  packages/plugins/plugin-crx/src/types/Settings.ts            # +4 merged fields
  packages/plugins/plugin-crx/src/types/Settings.test.ts       # moved from plugin-extension
  packages/plugins/plugin-crx/src/util/{index,pingExtension,pingExtension.test}.ts  # moved
  packages/plugins/plugin-crx/src/components/CrxSettings/*     # moved ExtensionSettings, renamed
  packages/plugins/plugin-crx/src/capabilities/react-surface.tsx  # new
  packages/plugins/plugin-crx/src/{CrxPlugin.tsx,translations.ts,meta.ts,moon.yml,PLUGIN.mdl}  # updated
  packages/apps/composer-app/{src/plugin-defs.tsx,package.json,tsconfig.json}  # drop plugin-extension
  packages/plugins/plugin-extension/                            # DELETED
M1 plugin-crx:
  src/types/PageAction.ts        # Snapshot, Descriptor, wire schemas, constants, PageAction type
  src/types/CrxCapabilities.ts   # +PageAction capability
  src/page-actions.ts            # list/invoke handlers + installer (DI-friendly)
  src/page-actions.test.ts
  src/capabilities/install-page-actions.ts
  package.json                   # +"./types" export, +@dxos/operation, +@dxos/echo
M1 composer-crx:
  src/page-actions/{types,match-pattern,registry,invoke,index}.ts (+tests)
  src/extractors/{types,snapshot,index}.ts (+snapshot.test.ts)
  src/components/PageActions/{PageActions.tsx,index.ts}
  src/{content.ts,background.ts,popup.tsx,bridge/sender.ts}     # wired
M1 plugin-bookmarks (new package, private):
  PLUGIN.mdl, package.json, moon.yml
  src/{index.ts,meta.ts,plugin.ts,BookmarksPlugin.tsx,translations.ts,vite-env.d.ts}
  src/types/{index.ts,Bookmark.ts,Bookmark.test.ts,BookmarkOperation.ts}
  src/operations/{definitions → in types/BookmarkOperation.ts, add-from-snapshot.ts,index.ts}
  src/capabilities/{index.ts,operation-handler.ts,page-action.ts,react-surface.tsx}
  src/containers/{index.ts,BookmarkArticle/*,BookmarkCard/*}
  src/components/index.ts
  packages/apps/composer-app/{src/plugin-defs.tsx,package.json,tsconfig.json}  # register
```

---

## M0 — merge plugin-extension into plugin-crx

### Task 1: Merge settings schema, util, and tests into plugin-crx

**Files:**

- Modify: `packages/plugins/plugin-crx/src/types/Settings.ts`
- Create: `packages/plugins/plugin-crx/src/util/index.ts`, `packages/plugins/plugin-crx/src/util/pingExtension.ts`, `packages/plugins/plugin-crx/src/util/pingExtension.test.ts`, `packages/plugins/plugin-crx/src/types/Settings.test.ts`

- [ ] **Step 1: Extend plugin-crx Settings schema.** Add the four plugin-extension fields (verbatim from `plugin-extension/src/types/Settings.ts`, including JSDoc) into the `Schema.Struct` in `plugin-crx/src/types/Settings.ts` after `autoOpenAfterClip`: `renderProxyEnabled`, `renderTimeout`, `renderActiveTab`, `developerMode`. Extend `defaults`:

```ts
export const defaults: Required<Settings> = {
  enabled: true,
  autoOpenAfterClip: false,
  renderProxyEnabled: true,
  renderTimeout: 20_000,
  renderActiveTab: false,
  developerMode: false,
};
```

- [ ] **Step 2: Move tests + util.** Copy `plugin-extension/src/types/Settings.test.ts` → `plugin-crx/src/types/Settings.test.ts` (update any field expectations to the merged shape). Copy `plugin-extension/src/util/pingExtension.ts` and `pingExtension.test.ts` → `plugin-crx/src/util/`, and create `plugin-crx/src/util/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export * from './pingExtension';
```

- [ ] **Step 3: Run tests.** `moon run plugin-crx:test`. Expected: PASS (new tests included).

- [ ] **Step 4: Commit** `refactor(plugin-crx): merge extension settings schema and ping util`.

### Task 2: Move the settings surface (CrxSettings component + react-surface)

**Files:**

- Create: `packages/plugins/plugin-crx/src/components/CrxSettings/{CrxSettings.tsx,CrxSettings.stories.tsx,index.ts}`, `packages/plugins/plugin-crx/src/capabilities/react-surface.tsx`
- Modify: `packages/plugins/plugin-crx/src/components/index.ts`, `packages/plugins/plugin-crx/src/capabilities/index.ts`, `packages/plugins/plugin-crx/src/CrxPlugin.tsx`, `packages/plugins/plugin-crx/src/translations.ts`, `packages/plugins/plugin-crx/moon.yml`

- [ ] **Step 1: Move component.** Copy `plugin-extension/src/components/ExtensionSettings/ExtensionSettings.tsx` → `plugin-crx/src/components/CrxSettings/CrxSettings.tsx`, renaming the component/type to `CrxSettings`/`CrxSettingsProps` and importing `pingExtension` from `'../../util'`. Copy the stories file alongside (rename accordingly). `CrxSettings/index.ts` exports `export * from './CrxSettings';`. Update `components/index.ts` to `export * from './CrxSettings';`.

- [ ] **Step 2: Surface capability.** Create `capabilities/react-surface.tsx` — same content as `plugin-extension/src/capabilities/react-surface.tsx` but importing `{ CrxSettings }` from `#components`, `meta` from `#meta`, and rendering `<CrxSettings …/>`. Add to `capabilities/index.ts`:

```ts
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
```

- [ ] **Step 3: Wire plugin + translations.** In `CrxPlugin.tsx` add `AppPlugin.addSurfaceModule({ activate: ReactSurface })` after the settings module. Merge plugin-extension translation keys into `plugin-crx/src/translations.ts` under `[meta.id]`: `'settings.title': 'Browser extension'`, `'test.title': 'Connection'`, `'test.button.label': 'Test connection'`, `'test.pending.message': 'Contacting extension…'`, `'test.connected.message': 'Connected to {{name}} v{{version}}.'`.

- [ ] **Step 4: moon entry point.** Add `--entryPoint=src/util/index.ts` to `plugin-crx/moon.yml` compile args. Add matching `#util` alias? Not needed — internal relative import only.

- [ ] **Step 5: Build + lint.** `moon run plugin-crx:build && moon run plugin-crx:lint -- --fix`. Expected: green.

- [ ] **Step 6: Commit** `refactor(plugin-crx): adopt extension settings surface with connection test`.

### Task 3: Update plugin-crx PLUGIN.mdl and meta

**Files:**

- Modify: `packages/plugins/plugin-crx/PLUGIN.mdl`, `packages/plugins/plugin-crx/src/meta.ts`

- [ ] **Step 1:** In `PLUGIN.mdl`: extend the `type Settings` block with the four merged fields (copy the field comments from plugin-extension's PLUGIN.mdl), and add a feature block after F-2:

```mdl
feat F-2b: Render-Proxy Settings
  desc: |
    Settings governing the extension's search render-proxy (page rendering for
    plugins that scrape client-rendered sites), absorbed from the retired
    plugin-extension. Includes a connection-test button that pings the
    extension over the page → content-script → background path.
  req:
    - The settings surface renders all merged fields plus a Test connection button.
    - The ping round-trip reports the extension's name and version on success.
```

- [ ] **Step 2:** Append one end-user sentence to the `meta.ts` description third paragraph: settings also control whether plugins may use the extension to render pages in the background (with timeout and focused-tab options) and a developer mode for troubleshooting.

- [ ] **Step 3: Commit** `docs(plugin-crx): document merged extension settings in PLUGIN.mdl`.

### Task 4: Deregister and delete plugin-extension

**Files:**

- Modify: `packages/apps/composer-app/src/plugin-defs.tsx` (drop line 31 import and line 206 `!isTauri && ExtensionPlugin(),`), `packages/apps/composer-app/package.json` (drop `"@dxos/plugin-extension"`), `packages/apps/composer-app/tsconfig.json` (drop the `plugin-extension` reference)
- Delete: `packages/plugins/plugin-extension/` (entire directory)

- [ ] **Step 1:** Make the three composer-app edits; `git rm -r packages/plugins/plugin-extension`.
- [ ] **Step 2:** Verify no stragglers: `grep -rn 'plugin-extension' packages --include='*.ts*' --include='*.json' --include='*.yaml'` → only lockfile/historic hits at most; then `HUSKY=0 CI=true pnpm install --no-frozen-lockfile` to refresh the lockfile.
- [ ] **Step 3:** `moon run composer-app:build`. Expected: green.
- [ ] **Step 4: Commit** `refactor: merge plugin-extension into plugin-crx and delete the package` (include `pnpm-lock.yaml`).

---

## M1 — plugin-crx page actions

### Task 5: PageAction types + capability

**Files:**

- Create: `packages/plugins/plugin-crx/src/types/PageAction.ts`
- Modify: `packages/plugins/plugin-crx/src/types/index.ts`, `packages/plugins/plugin-crx/src/types/CrxCapabilities.ts`, `packages/plugins/plugin-crx/package.json` (deps + `./types` export), `packages/plugins/plugin-crx/moon.yml` (no change — types entry exists)

- [ ] **Step 1:** Add deps: `@dxos/operation`, `@dxos/echo` as `workspace:*` to plugin-crx `package.json`; add a `"./types"` export subpath (copy the shape from `plugin-chess/package.json` `"./types"`). Run `HUSKY=0 CI=true pnpm install --no-frozen-lockfile`.

- [ ] **Step 2:** Create `types/PageAction.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { type Operation } from '@dxos/operation';

import * as Clip from './Clip';

/**
 * Page actions: operations contributed by plugins that the composer-crx
 * browser extension surfaces on web pages (popup toolbar, context menu).
 * The extension caches serializable descriptors; invocation arrives over the
 * same window CustomEvent bridge as clips.
 */

/**
 * Generic page capture produced by the extension's `snapshot` extractor.
 * Reuses the Clip envelope's source/selection/hints shapes.
 */
export const Snapshot = Schema.Struct({
  source: Clip.Source,
  selection: Schema.optional(Clip.Selection),
  hints: Schema.optional(Clip.Hints),
  html: Schema.optional(Schema.String),
  htmlTruncated: Schema.optional(Schema.Boolean),
});
export type Snapshot = Schema.Schema.Type<typeof Snapshot>;

/** Lazy DOM condition evaluated by the extension at popup-open / invoke time. */
export const Predicate = Schema.Struct({ exists: Schema.String });
export type Predicate = Schema.Schema.Type<typeof Predicate>;

/** Named built-in extractor reference (extension-bundled), with optional params. */
export const ExtractorRef = Schema.Struct({
  name: Schema.String,
  params: Schema.optional(Schema.Unknown),
});
export type ExtractorRef = Schema.Schema.Type<typeof ExtractorRef>;

export const Context = Schema.Literal('popup', 'page', 'selection', 'link');
export type Context = Schema.Schema.Type<typeof Context>;

/**
 * Serializable descriptor synced to the extension's registry cache.
 * `operation` carries the operation key for display/diagnostics only —
 * invocation is correlated by `id`.
 */
export const Descriptor = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  icon: Schema.String,
  urlPatterns: Schema.Array(Schema.String),
  predicate: Schema.optional(Predicate),
  extractor: ExtractorRef,
  contexts: Schema.Array(Context),
  operation: Schema.String,
});
export type Descriptor = Schema.Schema.Type<typeof Descriptor>;

/**
 * A live page-action contribution. The target operation must accept
 * `{ snapshot: Snapshot, target: Database }` and return `{ id: string }`.
 */
export type PageAction = Omit<Descriptor, 'operation'> & {
  operation: Operation.Definition<any, any>;
};

export const toDescriptor = (action: PageAction): Descriptor => ({
  ...action,
  operation: action.operation.meta.key.toString(),
});

//
// Wire protocol (extension → Composer page, via window CustomEvents).
//

export const LIST_EVENT = 'composer:page-actions:list';
export const LIST_ACK_EVENT = 'composer:page-actions:list:ack';
export const INVOKE_EVENT = 'composer:page-action:invoke';
export const INVOKE_ACK_EVENT = 'composer:page-action:invoke:ack';

export const ListRequest = Schema.Struct({
  version: Schema.Literal(1),
  id: Schema.String,
});
export type ListRequest = Schema.Schema.Type<typeof ListRequest>;

export type ListAck =
  | { version: 1; id: string; ok: true; actions: Descriptor[] }
  | { version: 1; id: string; ok: false; error: string };

export const PageInfo = Schema.Struct({
  url: Schema.String,
  title: Schema.String,
  favicon: Schema.optional(Schema.String),
});
export type PageInfo = Schema.Schema.Type<typeof PageInfo>;

/** Loose first-pass decode so newer versions get `unsupportedVersion`. */
export const Envelope = Schema.Struct({ version: Schema.Number });

export const InvokeRequest = Schema.Struct({
  version: Schema.Literal(1),
  id: Schema.String,
  actionId: Schema.String,
  page: PageInfo,
  inputs: Schema.Unknown,
  invokedFrom: Schema.Literal('popup', 'contextMenu'),
});
export type InvokeRequest = Schema.Schema.Type<typeof InvokeRequest>;

/**
 * Stable error codes:
 *   - `invalidPayload`     : schema decoding failed
 *   - `unsupportedVersion` : envelope version not supported
 *   - `unknownAction`      : no registered action with that id
 *   - `noSpace`            : no active space to write into
 *   - `operationFailed`    : the target operation returned an error
 */
export type InvokeAck =
  | { version: 1; id: string; ok: true; objectId?: string }
  | { version: 1; id: string; ok: false; error: string };
```

- [ ] **Step 3:** Append to `types/CrxCapabilities.ts`:

```ts
/**
 * Page actions contributed by plugins for the browser extension to surface.
 * Contributions are arrays; consumers flatten via `getAll`.
 */
export const PageAction = Capability.make<import('./PageAction').PageAction[]>(`${meta.id}.capability.page-action`);
```

- [ ] **Step 4:** Add `export * as PageAction from './PageAction';` to `types/index.ts`.

- [ ] **Step 5:** `moon run plugin-crx:build`. Expected: green. **Commit** `feat(plugin-crx): page-action types and capability`.

### Task 6: Page-action listener (list + invoke) with tests

**Files:**

- Create: `packages/plugins/plugin-crx/src/page-actions.ts`, `packages/plugins/plugin-crx/src/page-actions.test.ts`, `packages/plugins/plugin-crx/src/capabilities/install-page-actions.ts`
- Modify: `packages/plugins/plugin-crx/src/capabilities/index.ts`, `packages/plugins/plugin-crx/src/CrxPlugin.tsx`, `packages/plugins/plugin-crx/src/translations.ts`

- [ ] **Step 1: Write failing tests** (`page-actions.test.ts`). Test the handlers through a dependencies object so no capability manager is needed:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Operation } from '@dxos/operation';
import * as Schema from 'effect/Schema';
import { DXN } from '@dxos/keys';

import { PageAction } from './types';
import { handleInvokeEvent, handleListEvent } from './page-actions';

const TestOp = Operation.make({
  meta: { key: DXN.make('org.dxos.test.operation.page-action'), name: 'Test' },
  input: Schema.Struct({ snapshot: PageAction.Snapshot, target: Schema.Any }),
  output: Schema.Struct({ id: Schema.String }),
});

const action: PageAction.PageAction = {
  id: 'org.dxos.test/page-action/test',
  label: 'Test',
  icon: 'ph--bookmark-simple--regular',
  urlPatterns: ['https://*/*'],
  extractor: { name: 'snapshot' },
  contexts: ['popup'],
  operation: TestOp,
};

const snapshot = {
  source: { url: 'https://example.com', title: 'Example', clippedAt: '2026-06-09T00:00:00Z' },
};

const request = {
  version: 1,
  id: 'req-1',
  actionId: action.id,
  page: { url: 'https://example.com', title: 'Example' },
  inputs: snapshot,
  invokedFrom: 'popup',
};

const deps = (overrides: Partial<Parameters<typeof handleInvokeEvent>[1]> = {}) => ({
  getActions: () => [action],
  getTarget: () => ({}) as any,
  invoke: async () => ({ data: { id: 'obj-1' }, error: undefined }),
  ...overrides,
});

describe('page-actions', () => {
  test('list returns serializable descriptors', ({ expect }) => {
    const ack = handleListEvent({ version: 1, id: 'list-1' }, () => [action]);
    expect(ack).toEqual({
      version: 1,
      id: 'list-1',
      ok: true,
      actions: [{ ...action, operation: TestOp.meta.key.toString() }],
    });
  });

  test('list rejects malformed request', ({ expect }) => {
    const ack = handleListEvent({ nope: true }, () => [action]);
    expect(ack.ok).toBe(false);
  });

  test('invoke happy path returns objectId', async ({ expect }) => {
    const ack = await handleInvokeEvent(request, deps());
    expect(ack).toEqual({ version: 1, id: 'req-1', ok: true, objectId: 'obj-1' });
  });

  test('invoke rejects unsupported version', async ({ expect }) => {
    const ack = await handleInvokeEvent({ ...request, version: 2 }, deps());
    expect(ack).toMatchObject({ ok: false, error: 'unsupportedVersion' });
  });

  test('invoke rejects unknown action', async ({ expect }) => {
    const ack = await handleInvokeEvent({ ...request, actionId: 'nope' }, deps());
    expect(ack).toMatchObject({ ok: false, error: 'unknownAction' });
  });

  test('invoke maps missing space to noSpace', async ({ expect }) => {
    const ack = await handleInvokeEvent(request, deps({ getTarget: () => undefined }));
    expect(ack).toMatchObject({ ok: false, error: 'noSpace' });
  });

  test('invoke maps operation error to operationFailed', async ({ expect }) => {
    const ack = await handleInvokeEvent(
      request,
      deps({ invoke: async () => ({ data: undefined, error: new Error('boom') }) }),
    );
    expect(ack).toMatchObject({ ok: false, error: 'operationFailed' });
  });
});
```

- [ ] **Step 2: Run to verify failure.** `moon run plugin-crx:test -- src/page-actions.test.ts`. Expected: FAIL (module missing).

- [ ] **Step 3: Implement** `page-actions.ts` (mirror `listener.ts` structure and its two-pass decode; all comments end with periods):

```ts
//
// Copyright 2026 DXOS.org
//

import * as Either from 'effect/Either';
import * as Schema from 'effect/Schema';

import { type Capabilities, type CapabilityManager } from '@dxos/app-framework';
import { getActiveSpace } from '@dxos/app-toolkit';
import { type Database } from '@dxos/echo';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';

import { CrxCapabilities, PageAction } from '#types';

/**
 * Dependencies for the invoke handler, injected so the handler can be
 * unit-tested without a capability manager (the capability module wires the
 * real implementations).
 */
export type InvokeDeps = {
  getActions: () => PageAction.PageAction[];
  getTarget: () => Database.Database | undefined;
  invoke: (
    operation: PageAction.PageAction['operation'],
    input: unknown,
  ) => Promise<{ data?: { id?: string }; error?: unknown }>;
};

/**
 * Answer a registry-list request with the currently contributed actions as
 * serializable descriptors.
 */
export const handleListEvent = (detail: unknown, getActions: () => PageAction.PageAction[]): PageAction.ListAck => {
  const decoded = Schema.decodeUnknownEither(PageAction.ListRequest)(detail);
  if (Either.isLeft(decoded)) {
    log.info('rejected invalid page-actions list request');
    return { version: 1, id: '', ok: false, error: 'invalidPayload' };
  }
  return {
    version: 1,
    id: decoded.right.id,
    ok: true,
    actions: getActions().map(PageAction.toDescriptor),
  };
};

/**
 * Handle a single invoke request. Two-pass decode (loose envelope, then
 * strict payload) so newer versions yield `unsupportedVersion` rather than
 * the generic `invalidPayload`.
 */
export const handleInvokeEvent = async (detail: unknown, deps: InvokeDeps): Promise<PageAction.InvokeAck> => {
  const envelope = Schema.decodeUnknownEither(PageAction.Envelope)(detail);
  if (Either.isLeft(envelope)) {
    log.info('rejected invalid page-action envelope');
    return { version: 1, id: '', ok: false, error: 'invalidPayload' };
  }
  if (envelope.right.version !== 1) {
    log.info('rejected unsupported page-action version', { version: envelope.right.version });
    return { version: 1, id: '', ok: false, error: 'unsupportedVersion' };
  }

  const decoded = Schema.decodeUnknownEither(PageAction.InvokeRequest)(detail);
  if (Either.isLeft(decoded)) {
    log.info('rejected invalid page-action payload');
    return { version: 1, id: '', ok: false, error: 'invalidPayload' };
  }
  const request = decoded.right;

  const action = deps.getActions().find((candidate) => candidate.id === request.actionId);
  if (!action) {
    log.info('rejected unknown page action', { actionId: request.actionId });
    return { version: 1, id: request.id, ok: false, error: 'unknownAction' };
  }

  const target = deps.getTarget();
  if (!target) {
    return { version: 1, id: request.id, ok: false, error: 'noSpace' };
  }

  try {
    const { data, error } = await deps.invoke(action.operation, { snapshot: request.inputs, target });
    if (error || !data) {
      log.info('page-action operation failed', { actionId: action.id, error });
      return { version: 1, id: request.id, ok: false, error: 'operationFailed' };
    }
    log.info('page action invoked', { actionId: action.id, objectId: data.id });
    return { version: 1, id: request.id, ok: true, objectId: data.id };
  } catch (err) {
    log.catch(err);
    return { version: 1, id: request.id, ok: false, error: 'operationFailed' };
  }
};

/**
 * Attach the page-actions window event listeners. Returns a disposer.
 * Actions are resolved per-event via `getAll` so late-activating plugins are
 * always included.
 */
export const installPageActionListeners = (
  capabilities: CapabilityManager.CapabilityManager,
  invoker: Capabilities.OperationInvoker,
  onResult?: (ack: PageAction.InvokeAck, label?: string) => void,
): (() => void) => {
  const getActions = () => capabilities.getAll(CrxCapabilities.PageAction).flat();

  const onList = (event: Event) => {
    const ack = handleListEvent((event as CustomEvent).detail, getActions);
    window.dispatchEvent(new CustomEvent(PageAction.LIST_ACK_EVENT, { detail: ack }));
  };

  const onInvoke = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    const deps: InvokeDeps = {
      getActions,
      getTarget: () => {
        const client = capabilities.get(ClientCapabilities.Client);
        return getActiveSpace(client, capabilities)?.db;
      },
      invoke: (operation, input) => invoker.invokePromise(operation, input as any),
    };
    void handleInvokeEvent(detail, deps)
      .catch((err): PageAction.InvokeAck => {
        log.catch(err);
        return { version: 1, id: '', ok: false, error: 'operationFailed' };
      })
      .then((ack) => {
        window.dispatchEvent(new CustomEvent(PageAction.INVOKE_ACK_EVENT, { detail: ack }));
        try {
          const actionId = (detail as { actionId?: string } | null)?.actionId;
          onResult?.(ack, getActions().find((candidate) => candidate.id === actionId)?.label);
        } catch (err) {
          log.catch(err);
        }
      });
  };

  window.addEventListener(PageAction.LIST_EVENT, onList as EventListener);
  window.addEventListener(PageAction.INVOKE_EVENT, onInvoke as EventListener);
  return () => {
    window.removeEventListener(PageAction.LIST_EVENT, onList as EventListener);
    window.removeEventListener(PageAction.INVOKE_EVENT, onInvoke as EventListener);
  };
};
```

Note: if `invoker.invokePromise(operation, input as any)` needs the cast, prefer typing `InvokeDeps.invoke`'s `input` as the operation's input type via `Operation.Definition<any, any>` — only fall back to a commented cast at this genuine dynamic-dispatch boundary if inference fails (CLAUDE.md cast policy).

- [ ] **Step 4: Run tests.** `moon run plugin-crx:test -- src/page-actions.test.ts`. Expected: PASS.

- [ ] **Step 5: Capability module + wiring.** Create `capabilities/install-page-actions.ts` (mirror `install-clip-listener.ts`):

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { log } from '@dxos/log';

import { installPageActionListeners } from '../page-actions';
import { meta } from '../meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilityManager = yield* Capability.Service;
    const invoker = yield* Capability.get(Capabilities.OperationInvoker);

    installPageActionListeners(capabilityManager, invoker, (ack, label) => {
      if (ack.ok) {
        void invoker.invokePromise(LayoutOperation.AddToast, {
          id: `${meta.id}.page-action-${ack.objectId ?? ack.id}`,
          title: ['toast.page-action.success', { ns: meta.id, label: label ?? '' }],
        });
      } else {
        void invoker.invokePromise(LayoutOperation.AddToast, {
          id: `${meta.id}.page-action-error-${Date.now()}`,
          title: ['toast.page-action.error.title', { ns: meta.id }],
          description: [`toast.error.${ack.error}.message`, { ns: meta.id }],
        });
      }
    });

    log.info('CRX page-actions bridge installed');
  }),
);
```

Add to `capabilities/index.ts`: `export const InstallPageActions = Capability.lazy('InstallPageActions', () => import('./install-page-actions'));`. In `CrxPlugin.tsx` add:

```ts
Plugin.addModule({
  id: 'install-page-actions',
  activatesOn: ActivationEvents.ProcessManagerReady,
  activate: InstallPageActions,
}),
```

Add translations under `[meta.id]`: `'toast.page-action.success': '{{label}} done'`, `'toast.page-action.error.title': 'Action failed'`, `'toast.error.unknownAction.message': 'Unknown action — update Composer or the extension.'`, `'toast.error.operationFailed.message': 'The action failed to run.'` (the `invalidPayload`/`unsupportedVersion`/`noSpace` keys already exist).

- [ ] **Step 6: Build + full test + lint.** `moon run plugin-crx:build && moon run plugin-crx:test && moon run plugin-crx:lint -- --fix`. Expected: green.

- [ ] **Step 7:** Update `plugin-crx/PLUGIN.mdl`: add a `type PageActionDescriptor` block (fields per `Descriptor` above) and a feature block:

```mdl
feat F-8: Page Actions Registry & Invocation
  desc: |
    Plugins contribute page actions (serializable descriptor + target
    operation) under a plugin-scoped capability. This plugin answers the
    extension's registry-list requests (`composer:page-actions:list`) with
    descriptors and executes invoke requests (`composer:page-action:invoke`)
    by resolving the active space and invoking the target operation with
    `{ snapshot, target }`. Every request is acked with stable error codes
    (invalidPayload, unsupportedVersion, unknownAction, noSpace,
    operationFailed); outcomes surface as toasts.
```

- [ ] **Step 8: Commit** `feat(plugin-crx): page-actions registry and invoke bridge`.

---

## M1 — composer-crx extension side

### Task 7: Wire types + match patterns

**Files:**

- Create: `packages/apps/composer-crx/src/page-actions/types.ts`, `packages/apps/composer-crx/src/page-actions/types.test.ts`, `packages/apps/composer-crx/src/page-actions/match-pattern.ts`, `packages/apps/composer-crx/src/page-actions/match-pattern.test.ts`, `packages/apps/composer-crx/src/page-actions/index.ts`

- [ ] **Step 1: Write failing tests.** `match-pattern.test.ts` (mirror `bridge/urls.test.ts` style):

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { matchesUrlPatterns } from './match-pattern';

describe('matchesUrlPatterns', () => {
  test('all-urls patterns', ({ expect }) => {
    expect(matchesUrlPatterns('https://example.com/page', ['https://*/*'])).toBe(true);
    expect(matchesUrlPatterns('http://example.com/', ['http://*/*'])).toBe(true);
    expect(matchesUrlPatterns('https://example.com/', ['<all_urls>'])).toBe(true);
  });

  test('scheme wildcard matches http and https only', ({ expect }) => {
    expect(matchesUrlPatterns('https://a.com/x', ['*://*/*'])).toBe(true);
    expect(matchesUrlPatterns('ftp://a.com/x', ['*://*/*'])).toBe(false);
  });

  test('host and subdomain wildcards', ({ expect }) => {
    expect(matchesUrlPatterns('https://www.youtube.com/watch?v=1', ['https://*.youtube.com/watch*'])).toBe(true);
    expect(matchesUrlPatterns('https://youtube.com/watch?v=1', ['https://*.youtube.com/watch*'])).toBe(true);
    expect(matchesUrlPatterns('https://vimeo.com/watch', ['https://*.youtube.com/watch*'])).toBe(false);
  });

  test('path matching includes query string', ({ expect }) => {
    expect(matchesUrlPatterns('https://a.com/p/q?x=1', ['https://a.com/p/*'])).toBe(true);
    expect(matchesUrlPatterns('https://a.com/other', ['https://a.com/p/*'])).toBe(false);
  });

  test('invalid inputs are false', ({ expect }) => {
    expect(matchesUrlPatterns('not-a-url', ['https://*/*'])).toBe(false);
    expect(matchesUrlPatterns('https://a.com/', ['garbage'])).toBe(false);
  });
});
```

`types.test.ts` — round-trip the decoders: `decodeDescriptor` accepts a valid descriptor and rejects missing `id`/`label`/non-array `urlPatterns`; `decodeListAck`/`decodeInvokeAck` accept ok and error shapes, reject version≠1 (model the tests on `search-proxy/types.test.ts`).

- [ ] **Step 2:** Run: `moon run composer-crx:test -- src/page-actions`. Expected: FAIL.

- [ ] **Step 3: Implement.** `match-pattern.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

/**
 * Chrome extension match-pattern evaluation (https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns).
 * Supports `<all_urls>`, scheme `*` (http/https), host `*` / `*.domain`, and
 * path globs. Used to gate page actions by URL, both in the background and
 * the popup. Invalid patterns or URLs never match.
 */

/**
 * Linear-time glob match (`*` wildcards only). A backtracking regex here is a
 * ReDoS hazard: patterns come from untrusted descriptors and inputs from
 * arbitrary page URLs, so matching must not be super-linear.
 */
const globMatches = (glob: string, input: string): boolean => {
  let globIdx = 0;
  let inputIdx = 0;
  let starIdx = -1;
  let backtrackIdx = 0;
  while (inputIdx < input.length) {
    if (globIdx < glob.length && glob[globIdx] === input[inputIdx]) {
      globIdx++;
      inputIdx++;
    } else if (globIdx < glob.length && glob[globIdx] === '*') {
      starIdx = globIdx++;
      backtrackIdx = inputIdx;
    } else if (starIdx >= 0) {
      globIdx = starIdx + 1;
      inputIdx = ++backtrackIdx;
    } else {
      return false;
    }
  }
  while (globIdx < glob.length && glob[globIdx] === '*') {
    globIdx++;
  }
  return globIdx === glob.length;
};

const matchesPattern = (url: URL, pattern: string): boolean => {
  if (pattern === '<all_urls>') {
    return url.protocol === 'http:' || url.protocol === 'https:';
  }
  const parsed = /^(\*|https?):\/\/(\*|(?:\*\.)?[^/*]+)(\/.*)$/.exec(pattern);
  if (!parsed) {
    return false;
  }
  const [, scheme, host, path] = parsed;

  const protocol = url.protocol.replace(/:$/, '');
  if (scheme === '*' ? !(protocol === 'http' || protocol === 'https') : protocol !== scheme) {
    return false;
  }

  // Lowercase the pattern host before comparing: Chrome is case-insensitive,
  // and URL.hostname is already lowercase.
  const hostLower = host.toLowerCase();
  if (hostLower === '*') {
    // Any host.
  } else if (hostLower.startsWith('*.')) {
    const suffix = hostLower.slice(2);
    if (url.hostname !== suffix && !url.hostname.endsWith(`.${suffix}`)) {
      return false;
    }
  } else if (url.hostname !== hostLower) {
    return false;
  }

  return globMatches(path, url.pathname + url.search);
};

/**
 * Whether the URL matches at least one of the patterns.
 */
export const matchesUrlPatterns = (url: string, patterns: readonly string[]): boolean => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return patterns.some((pattern) => matchesPattern(parsed, pattern));
};
```

`types.ts` — wire mirror of `plugin-crx/src/types/PageAction.ts` with hand validators in the `search-proxy/types.ts` idiom. Include: TS types `PageActionDescriptor`, `PageActionsRegistry = { fetchedAt: string; actions: PageActionDescriptor[] }`, `ListAck`, `InvokeRequest`, `InvokeAck`, `Snapshot` (structural type only); constants:

```ts
export const PAGE_ACTIONS_LIST_EVENT = 'composer:page-actions:list';
export const PAGE_ACTIONS_LIST_ACK_EVENT = 'composer:page-actions:list:ack';
export const PAGE_ACTION_INVOKE_EVENT = 'composer:page-action:invoke';
export const PAGE_ACTION_INVOKE_ACK_EVENT = 'composer:page-action:invoke:ack';
export const PAGE_ACTIONS_LIST_MESSAGE_TYPE = 'composer-crx:page-actions:list';
export const PAGE_ACTION_INVOKE_MESSAGE_TYPE = 'composer-crx:page-action:invoke';
export const PAGE_ACTION_RUN_MESSAGE_TYPE = 'composer-crx:page-action:run';
export const PAGE_ACTION_EXTRACT_MESSAGE_TYPE = 'composer-crx:page-action:extract';
export const PAGE_ACTION_PREDICATE_MESSAGE_TYPE = 'composer-crx:page-action:predicate';
export const PAGE_ACTIONS_READY_MESSAGE_TYPE = 'composer-crx:page-actions:ready';
export const PAGE_ACTIONS_STORAGE_KEY = 'composer-crx:page-actions-registry';
```

and validators `decodeDescriptor`, `decodeListAck`, `decodeInvokeAck` (each field-checks like `decodeRenderAck`; descriptors with unknown extra fields pass — forward compatibility; entries failing validation are dropped, not fatal). `index.ts` barrel re-exports types, match-pattern, registry, invoke (registry/invoke added in later tasks — start with types + match-pattern and grow).

- [ ] **Step 4:** Run: `moon run composer-crx:test -- src/page-actions`. Expected: PASS. **Commit** `feat(composer-crx): page-action wire types and match patterns`.

### Task 8: Extractors

**Files:**

- Create: `packages/apps/composer-crx/src/extractors/{types.ts,snapshot.ts,snapshot.test.ts,index.ts}`

- [ ] **Step 1: Failing test** (`snapshot.test.ts`, mirror the jsdom/document setup used by `picker/harvest.test.ts` — read that file first and copy its environment configuration):

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { snapshotExtractor } from './snapshot';

describe('snapshot extractor', () => {
  test('captures source, hints, and html', async ({ expect }) => {
    document.head.innerHTML = '<title>Test Page</title><meta property="og:title" content="OG Title" />';
    document.body.innerHTML = '<h1>Heading</h1><p>Content</p>';

    const snapshot = await snapshotExtractor.run({ document });
    expect(snapshot.source.title).toBe('Test Page');
    expect(snapshot.source.url).toContain('://');
    expect(snapshot.source.clippedAt).toMatch(/^\d{4}-/);
    expect(snapshot.hints?.ogTitle).toBe('OG Title');
    expect(snapshot.hints?.h1).toBe('Heading');
    expect(snapshot.html).toContain('<p>Content</p>');
    expect(snapshot.htmlTruncated).toBeUndefined();
  });
});
```

- [ ] **Step 2:** Run: `moon run composer-crx:test -- src/extractors`. Expected: FAIL.

- [ ] **Step 3: Implement.** `types.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { type Snapshot } from '../page-actions/types';

/**
 * Context handed to a bundled extractor. Runs in the content-script world of
 * the target page.
 */
export type ExtractorContext = {
  document: Document;
  /** Descriptor-supplied parameters (validated by the extractor itself). */
  params?: unknown;
};

/**
 * A bundled input extractor referenced by page-action descriptors by name.
 * Output is validated Composer-side by the target operation's input schema.
 */
export type Extractor<T = unknown> = {
  name: string;
  run: (context: ExtractorContext) => Promise<T>;
};

export type { Snapshot };
```

`snapshot.ts` — reuse the harvest helpers:

```ts
//
// Copyright 2026 DXOS.org
//

import { harvestFavicon, harvestHints } from '../picker/harvest';
import { type Snapshot } from '../page-actions/types';
import { type Extractor } from './types';

const MAX_HTML_LENGTH = 500_000;

/**
 * Default extractor: a generic page capture (source, og/JSON-LD hints,
 * current text selection, truncated document HTML).
 */
export const snapshotExtractor: Extractor<Snapshot> = {
  name: 'snapshot',
  run: async ({ document: doc }) => {
    const html = doc.documentElement?.outerHTML ?? '';
    const truncated = html.length > MAX_HTML_LENGTH;
    const selectionText = doc.defaultView?.getSelection?.()?.toString().trim();
    return {
      source: {
        url: doc.location?.href ?? '',
        title: doc.title ?? '',
        favicon: harvestFavicon(doc),
        clippedAt: new Date().toISOString(),
      },
      selection: selectionText ? { text: selectionText } : undefined,
      hints: harvestHints(doc),
      html: truncated ? html.slice(0, MAX_HTML_LENGTH) : html,
      htmlTruncated: truncated || undefined,
    };
  },
};
```

`index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { snapshotExtractor } from './snapshot';
import { type Extractor, type ExtractorContext } from './types';

export * from './types';

const extractors = new Map<string, Extractor>([[snapshotExtractor.name, snapshotExtractor]]);

/**
 * Run a bundled extractor by name. Throws on unknown names so callers
 * surface a stable error rather than shipping an empty payload.
 */
export const runExtractor = async (name: string, context: ExtractorContext): Promise<unknown> => {
  const extractor = extractors.get(name);
  if (!extractor) {
    throw new Error(`Unknown extractor: ${name}`);
  }
  return extractor.run(context);
};
```

- [ ] **Step 4:** Run: `moon run composer-crx:test -- src/extractors`. Expected: PASS. **Commit** `feat(composer-crx): extractor registry with snapshot extractor`.

### Task 9: Content-script relays

**Files:**

- Modify: `packages/apps/composer-crx/src/content.ts`

- [ ] **Step 1: All-pages handlers** (extract + predicate). Add to `content.ts` after `installBridge()` definitions, and call from `main()`:

```ts
import { runExtractor } from './extractors';
import {
  PAGE_ACTION_EXTRACT_MESSAGE_TYPE,
  PAGE_ACTION_PREDICATE_MESSAGE_TYPE,
  PAGE_ACTIONS_LIST_MESSAGE_TYPE,
  PAGE_ACTIONS_LIST_ACK_EVENT,
  PAGE_ACTIONS_LIST_EVENT,
  PAGE_ACTIONS_READY_MESSAGE_TYPE,
  PAGE_ACTION_INVOKE_ACK_EVENT,
  PAGE_ACTION_INVOKE_EVENT,
  PAGE_ACTION_INVOKE_MESSAGE_TYPE,
  decodeListAck,
  decodeInvokeAck,
} from './page-actions';

/**
 * All-pages handlers: run a bundled extractor / evaluate a DOM predicate on
 * behalf of the background worker or popup.
 */
const installPageActionHelpers = () => {
  browser.runtime.onMessage.addListener((msg: any): undefined | Promise<unknown> => {
    if (!msg || msg.type !== PAGE_ACTION_EXTRACT_MESSAGE_TYPE) {
      return undefined;
    }
    return runExtractor(msg.name as string, { document, params: msg.params })
      .then((inputs) => ({ ok: true, inputs }))
      .catch((err) => ({ ok: false, error: err instanceof Error ? err.message : 'extractorFailed' }));
  });

  browser.runtime.onMessage.addListener((msg: any): undefined | Promise<unknown> => {
    if (!msg || msg.type !== PAGE_ACTION_PREDICATE_MESSAGE_TYPE) {
      return undefined;
    }
    try {
      return Promise.resolve({ ok: true, matches: !!document.querySelector(msg.exists as string) });
    } catch {
      return Promise.resolve({ ok: true, matches: false });
    }
  });
};
```

- [ ] **Step 2: Composer-pages relay** (list + invoke round-trips; same correlation pattern as `installBridge`). Generalize: add a helper and use it for both message types:

```ts
const PAGE_ACTION_ACK_TIMEOUT_MS = 8_000;

/**
 * Composer-tab relay: forward a background request to the page as a
 * CustomEvent and resolve with the page's correlated ack (by `id`).
 */
const requestFromPage = <T extends { id?: string }>(
  requestEvent: string,
  ackEvent: string,
  request: { id: string },
  decode: (detail: unknown) => T | undefined,
  timeoutAck: T,
): Promise<T> =>
  new Promise<T>((resolve) => {
    let settled = false;
    const onAck = (ev: Event) => {
      const ack = decode((ev as CustomEvent).detail);
      if (settled || !ack || ack.id !== request.id) {
        return;
      }
      settled = true;
      window.removeEventListener(ackEvent, onAck);
      resolve(ack);
    };
    window.addEventListener(ackEvent, onAck);
    setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      window.removeEventListener(ackEvent, onAck);
      resolve(timeoutAck);
    }, PAGE_ACTION_ACK_TIMEOUT_MS);
    window.dispatchEvent(new CustomEvent(requestEvent, { detail: request }));
  });

/**
 * Composer-pages relay for the page-actions bridge. Notifies the background
 * when ready so it can refresh its registry cache.
 */
const installPageActionsRelay = async (): Promise<void> => {
  if (!(await isComposerUrl(window.location.href))) {
    return;
  }

  browser.runtime.onMessage.addListener((msg: any): undefined | Promise<unknown> => {
    if (!msg || msg.type !== PAGE_ACTIONS_LIST_MESSAGE_TYPE) {
      return undefined;
    }
    return requestFromPage(PAGE_ACTIONS_LIST_EVENT, PAGE_ACTIONS_LIST_ACK_EVENT, msg.request, decodeListAck, {
      version: 1,
      id: msg.request?.id ?? '',
      ok: false,
      error: 'timeout',
    });
  });

  browser.runtime.onMessage.addListener((msg: any): undefined | Promise<unknown> => {
    if (!msg || msg.type !== PAGE_ACTION_INVOKE_MESSAGE_TYPE) {
      return undefined;
    }
    return requestFromPage(PAGE_ACTION_INVOKE_EVENT, PAGE_ACTION_INVOKE_ACK_EVENT, msg.request, decodeInvokeAck, {
      version: 1,
      id: msg.request?.id ?? '',
      ok: false,
      error: 'timeout',
    });
  });

  // Let the background refresh its registry once the page is up.
  browser.runtime.sendMessage({ type: PAGE_ACTIONS_READY_MESSAGE_TYPE }).catch((err) => log.catch(err));
};
```

Call `installPageActionHelpers();` and `void installPageActionsRelay();` from `main()`.

- [ ] **Step 3: Build.** `moon run composer-crx:build`. Expected: green. **Commit** `feat(composer-crx): content-script page-action relays`.

### Task 10: Background registry + invoke orchestration

**Files:**

- Create: `packages/apps/composer-crx/src/page-actions/registry.ts`, `packages/apps/composer-crx/src/page-actions/invoke.ts`
- Modify: `packages/apps/composer-crx/src/bridge/sender.ts` (export `findComposerTab`), `packages/apps/composer-crx/src/background.ts`

- [ ] **Step 1: Export tab discovery.** In `bridge/sender.ts`, extract the first three lines of `deliverClip`'s `try` into an exported helper and use it in `deliverClip`:

```ts
/**
 * Find the best currently-open Composer tab (highest score), if any.
 */
export const findComposerTab = async (): Promise<browser.Tabs.Tab | undefined> => {
  const urls = await getComposerUrls();
  const tabs = await browser.tabs.query({ url: urls });
  return pickBestTab(tabs);
};
```

- [ ] **Step 2: Registry cache** (`registry.ts`):

```ts
//
// Copyright 2026 DXOS.org
//

import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

import { findComposerTab } from '../bridge/sender';
import { matchesUrlPatterns } from './match-pattern';
import {
  type PageActionDescriptor,
  type PageActionsRegistry,
  PAGE_ACTIONS_LIST_MESSAGE_TYPE,
  PAGE_ACTIONS_STORAGE_KEY,
  decodeListAck,
} from './types';

let counter = 0;
const nextId = (): string => globalThis.crypto?.randomUUID?.() ?? `pa-${(counter += 1)}`;

/**
 * Refresh the descriptor cache from a Composer tab. No-op (keeps the stale
 * cache) when no tab is available or the request fails — context menus and
 * the popup must keep working from the last known registry.
 */
export const refreshRegistry = async (tabId?: number): Promise<void> => {
  const target = tabId ?? (await findComposerTab())?.id;
  if (target === undefined) {
    return;
  }
  try {
    const response = await browser.tabs.sendMessage(target, {
      type: PAGE_ACTIONS_LIST_MESSAGE_TYPE,
      request: { version: 1, id: nextId() },
    });
    const ack = decodeListAck(response);
    if (!ack?.ok) {
      log.info('page-actions registry refresh failed', { error: ack?.error });
      return;
    }
    const registry: PageActionsRegistry = { fetchedAt: new Date().toISOString(), actions: ack.actions };
    await browser.storage.local.set({ [PAGE_ACTIONS_STORAGE_KEY]: registry });
    log.info('page-actions registry refreshed', { count: ack.actions.length });
  } catch (err) {
    log.catch(err);
  }
};

/**
 * Read the cached registry (empty when never fetched).
 */
export const getRegistry = async (): Promise<PageActionsRegistry> => {
  const stored = await browser.storage.local.get(PAGE_ACTIONS_STORAGE_KEY);
  const registry = stored?.[PAGE_ACTIONS_STORAGE_KEY] as PageActionsRegistry | undefined;
  return registry ?? { fetchedAt: '', actions: [] };
};

/**
 * Cached actions applicable to a URL in a given context.
 */
export const getActionsForUrl = async (url: string, context: 'popup' | 'page'): Promise<PageActionDescriptor[]> => {
  const { actions } = await getRegistry();
  return actions.filter((action) => action.contexts.includes(context) && matchesUrlPatterns(url, action.urlPatterns));
};
```

- [ ] **Step 3: Invoke orchestration** (`invoke.ts`):

```ts
//
// Copyright 2026 DXOS.org
//

import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

import { findComposerTab, openComposerTab } from '../bridge/sender';
import { getRegistry } from './registry';
import {
  type InvokeAck,
  PAGE_ACTION_EXTRACT_MESSAGE_TYPE,
  PAGE_ACTION_INVOKE_MESSAGE_TYPE,
  decodeInvokeAck,
} from './types';

const OPEN_RETRY_INTERVAL_MS = 1_500;
const OPEN_RETRY_ATTEMPTS = 10;

let counter = 0;
const nextId = (): string => globalThis.crypto?.randomUUID?.() ?? `invoke-${(counter += 1)}`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Deliver an invoke request to a Composer tab, opening one (and retrying
 * while it boots) when none is available. A `timeout` ack during the retry
 * window is treated as "app still booting" and retried.
 */
const deliverInvoke = async (request: object): Promise<InvokeAck> => {
  const id = (request as { id: string }).id;
  let opened = false;
  for (let attempt = 0; attempt < OPEN_RETRY_ATTEMPTS; attempt++) {
    const tab = await findComposerTab();
    if (!tab?.id) {
      if (!opened) {
        await openComposerTab();
        opened = true;
      }
      await sleep(OPEN_RETRY_INTERVAL_MS);
      continue;
    }
    try {
      const response = await browser.tabs.sendMessage(tab.id, {
        type: PAGE_ACTION_INVOKE_MESSAGE_TYPE,
        request,
      });
      const ack = decodeInvokeAck(response);
      if (ack && !(opened && !ack.ok && ack.error === 'timeout')) {
        return ack;
      }
    } catch (err) {
      // Content script not ready yet (tab still loading) — retry.
      log.info('invoke delivery retry', { attempt, error: err instanceof Error ? err.message : String(err) });
    }
    await sleep(OPEN_RETRY_INTERVAL_MS);
  }
  return { version: 1, id, ok: false, error: 'timeout' };
};

/**
 * Run a page action end-to-end: extract inputs on the source tab, then
 * deliver the invoke request to Composer.
 */
export const runPageAction = async ({ actionId, tabId }: { actionId: string; tabId: number }): Promise<InvokeAck> => {
  const { actions } = await getRegistry();
  const action = actions.find((candidate) => candidate.id === actionId);
  if (!action) {
    return { version: 1, id: '', ok: false, error: 'unknownAction' };
  }

  const tab = await browser.tabs.get(tabId);
  const extracted = (await browser.tabs.sendMessage(tabId, {
    type: PAGE_ACTION_EXTRACT_MESSAGE_TYPE,
    name: action.extractor.name,
    params: action.extractor.params,
  })) as { ok: boolean; inputs?: unknown; error?: string };
  if (!extracted?.ok) {
    return { version: 1, id: '', ok: false, error: extracted?.error ?? 'extractorFailed' };
  }

  const request = {
    version: 1,
    id: nextId(),
    actionId: action.id,
    page: { url: tab.url ?? '', title: tab.title ?? '' },
    inputs: extracted.inputs,
    invokedFrom: 'popup' as const,
  };
  return deliverInvoke(request);
};
```

- [ ] **Step 4: Background wiring.** In `background.ts` `main()`, add (mirroring the existing `BACKGROUND_CLIP_MSG_TYPE` listener style):

```ts
import { refreshRegistry, runPageAction } from './page-actions';
import { PAGE_ACTIONS_READY_MESSAGE_TYPE, PAGE_ACTION_RUN_MESSAGE_TYPE } from './page-actions/types';

// Page actions: refresh the registry when a Composer tab announces itself,
// and run actions on behalf of the popup.
browser.runtime.onMessage.addListener((msg: any, sender): undefined | Promise<unknown> => {
  if (!msg || msg.type !== PAGE_ACTIONS_READY_MESSAGE_TYPE) {
    return undefined;
  }
  return refreshRegistry(sender.tab?.id);
});
browser.runtime.onMessage.addListener((msg: any): undefined | Promise<unknown> => {
  if (!msg || msg.type !== PAGE_ACTION_RUN_MESSAGE_TYPE) {
    return undefined;
  }
  return runPageAction({ actionId: msg.actionId, tabId: msg.tabId });
});
browser.runtime.onStartup?.addListener?.(() => void refreshRegistry());
void refreshRegistry();
```

- [ ] **Step 5: Build + tests.** `moon run composer-crx:build && moon run composer-crx:test`. Expected: green. **Commit** `feat(composer-crx): page-action registry cache and invoke orchestration`.

### Task 11: Popup page-actions menu

**Files:**

- Create: `packages/apps/composer-crx/src/components/PageActions/{PageActions.tsx,index.ts}`
- Modify: `packages/apps/composer-crx/src/components/index.ts`, `packages/apps/composer-crx/src/popup.tsx`

- [ ] **Step 1: Component.** `PageActions.tsx` (popup is plain extension UI — `@dxos/react-ui` Button/Icon, no app-framework):

```tsx
//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';
import browser from 'webextension-polyfill';

import { log } from '@dxos/log';
import { Button, Icon } from '@dxos/react-ui';

import { getActionsForUrl } from '../../page-actions/registry';
import {
  type InvokeAck,
  type PageActionDescriptor,
  PAGE_ACTION_PREDICATE_MESSAGE_TYPE,
  PAGE_ACTION_RUN_MESSAGE_TYPE,
} from '../../page-actions/types';

type ActionState = 'idle' | 'pending' | 'ok' | 'error';

export type PageActionsProps = {
  tabId: number;
  tabUrl: string;
};

/**
 * Toolbar row of page actions applicable to the current tab. Stays open
 * while an invocation is pending and reports the outcome inline.
 */
export const PageActions = ({ tabId, tabUrl }: PageActionsProps) => {
  const [actions, setActions] = useState<PageActionDescriptor[]>([]);
  const [states, setStates] = useState<Record<string, ActionState>>({});
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const candidates = await getActionsForUrl(tabUrl, 'popup');
      const visible: PageActionDescriptor[] = [];
      for (const action of candidates) {
        if (action.predicate) {
          try {
            const result = (await browser.tabs.sendMessage(tabId, {
              type: PAGE_ACTION_PREDICATE_MESSAGE_TYPE,
              exists: action.predicate.exists,
            })) as { matches?: boolean };
            if (!result?.matches) {
              continue;
            }
          } catch {
            continue;
          }
        }
        visible.push(action);
      }
      setActions(visible);
    })();
  }, [tabId, tabUrl]);

  const handleRun = useCallback(
    async (action: PageActionDescriptor) => {
      setStates((current) => ({ ...current, [action.id]: 'pending' }));
      setMessage(null);
      try {
        const ack = (await browser.runtime.sendMessage({
          type: PAGE_ACTION_RUN_MESSAGE_TYPE,
          actionId: action.id,
          tabId,
        })) as InvokeAck;
        setStates((current) => ({ ...current, [action.id]: ack.ok ? 'ok' : 'error' }));
        setMessage(ack.ok ? `${action.label}: done` : `${action.label}: ${ack.ok === false ? ack.error : ''}`);
      } catch (err) {
        log.catch(err);
        setStates((current) => ({ ...current, [action.id]: 'error' }));
        setMessage(`${action.label}: failed`);
      }
    },
    [tabId],
  );

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className='flex flex-col gap-1 p-2'>
      <div className='flex flex-wrap gap-2'>
        {actions.map((action) => (
          <Button key={action.id} onClick={() => handleRun(action)} disabled={states[action.id] === 'pending'}>
            <Icon icon={action.icon} size={4} classNames='mie-2' />
            {action.label}
          </Button>
        ))}
      </div>
      {message && (
        <span role='status' aria-live='polite' className='text-sm text-description'>
          {message}
        </span>
      )}
    </div>
  );
};
```

`index.ts`: `export * from './PageActions';`; add `export * from './PageActions';` to `components/index.ts`.

- [ ] **Step 2: Wire into popup.** In `popup.tsx`, track the active tab id alongside the url (extend the existing `tabs.query` effect to `setTab({ id: tab.id, url })`), and render inside `Container` above the Chat block:

```tsx
{
  tab?.id !== undefined && tab.url && <PageActions tabId={tab.id} tabUrl={tab.url} />;
}
```

- [ ] **Step 3: Build.** `moon run composer-crx:build`. Expected: green. **Commit** `feat(composer-crx): page-actions menu in popup`.

---

## M1 — plugin-bookmarks

### Task 12: PLUGIN.mdl (USER APPROVAL CHECKPOINT)

**Files:**

- Create: `packages/plugins/plugin-bookmarks/PLUGIN.mdl`

- [ ] **Step 1:** Write the spec using `packages/reflect/deus/lang/PLUGIN-.template.mdl` as the template and `plugin-chess/PLUGIN.mdl` as the reference. Content: header (`id: org.dxos.plugin.bookmarks`, `name: BookmarksPlugin`, `version: 0.1.0`); prose: manages a list of clipped web pages with optional summaries; created primarily via the browser extension's "Add bookmark" page action. Types: `Bookmark { title, url, favicon?, image?, excerpt?, summary? }`. Features: F-1 Bookmark schema registration; F-2 AddFromSnapshot operation (snapshot → Bookmark in target db, title ← hints.ogTitle ?? source.title, excerpt ← hints.ogDescription ?? first 280 chars of selection text, image ← hints.ogImage, favicon ← source.favicon); F-3 page-action contribution (all http(s) URLs, snapshot extractor, popup+page contexts); F-4 surfaces (Card + Article rendering title/image/excerpt/summary with a link to the source). Acceptance tests: T-1 fromSnapshot field mapping with hints; T-2 fromSnapshot fallbacks without hints; T-3 AddFromSnapshot persists a Bookmark.

- [ ] **Step 2: CHECKPOINT — present the PLUGIN.mdl to the user for approval before writing any plugin code.** Commit after approval: `docs(plugin-bookmarks): plugin specification`.

### Task 13: Package skeleton

**Files:**

- Create: `packages/plugins/plugin-bookmarks/{package.json,moon.yml}`, `src/{index.ts,meta.ts,plugin.ts,BookmarksPlugin.tsx,translations.ts,vite-env.d.ts}`, `src/types/index.ts`, `src/capabilities/index.ts`, `src/components/index.ts`, `src/containers/index.ts`
- Modify: `packages/apps/composer-app/{src/plugin-defs.tsx,package.json,tsconfig.json}` (registration deferred to Task 17)

- [ ] **Step 1: package.json** — copy `plugin-crx/package.json`, rename to `@dxos/plugin-bookmarks`, description "Bookmarks for clipped web pages.", keep `"private": true`. `#imports`: `#capabilities`, `#components`, `#containers`, `#meta`, `#operations`, `#plugin` (→ `./src/BookmarksPlugin.tsx`), `#translations`, `#types` (copy alias shapes from plugin-chess). `exports`: `.`, `./assets/PLUGIN.mdl`, `./plugin`, `./translations`, `./types`. Dependencies (all `workspace:*` unless noted): `@dxos/app-framework`, `@dxos/app-toolkit`, `@dxos/echo`, `@dxos/keys`, `@dxos/log`, `@dxos/operation`, `@dxos/plugin-crx`, `@dxos/plugin-space`, `@dxos/react-ui`, `@dxos/ui-theme`, `@dxos/util`, `effect: catalog:`; devDependencies `@types/react`, `react`, `vite`, `vitest` (catalog); peer `@dxos/react-ui`, `react`.

- [ ] **Step 2: moon.yml**:

```yaml
layer: library
language: typescript
tags:
  - ts-build
  - ts-test
tasks:
  compile:
    args:
      - '--entryPoint=src/index.ts'
      - '--entryPoint=src/BookmarksPlugin.tsx'
      - '--entryPoint=src/capabilities/index.ts'
      - '--entryPoint=src/components/index.ts'
      - '--entryPoint=src/containers/index.ts'
      - '--entryPoint=src/meta.ts'
      - '--entryPoint=src/operations/index.ts'
      - '--entryPoint=src/plugin.ts'
      - '--entryPoint=src/translations.ts'
      - '--entryPoint=src/types/index.ts'
      - '--platform=neutral'
```

- [ ] **Step 3: src skeleton.** `meta.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.bookmarks'),
  name: 'Bookmarks',
  author: 'DXOS',
  description: trim`
    Save web pages you want to come back to. Add a bookmark from any page with one click in the
    Composer browser extension — the page's title, image, and description are captured
    automatically, and each bookmark keeps a link back to the original page.

    Bookmarks live in your space alongside everything else, ready to organize into collections,
    open from search, or summarize later.
  `,
  icon: 'ph--bookmark-simple--regular',
  iconHue: 'amber',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-bookmarks',
  spec: 'PLUGIN.mdl',
  tags: ['labs'],
});
```

`plugin.ts` (mirror plugin-crx), `index.ts` (`export * from './meta'; export * from './types';`), `vite-env.d.ts` (copy from plugin-crx), `translations.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Bookmark } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Bookmark.Bookmark)]: {
        'typename.label': 'Bookmark',
        'typename.label_zero': 'Bookmarks',
        'typename.label_one': 'Bookmark',
        'typename.label_other': 'Bookmarks',
      },
      [meta.id]: {
        'plugin.name': 'Bookmarks',
        'open-source.button': 'Open page',
      },
    },
  },
] as const satisfies Resource[];
```

`BookmarksPlugin.tsx`:

```tsx
//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { OperationHandler, PageActionProvider, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Bookmark } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const BookmarksPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSchemaModule({ schema: [Bookmark.Bookmark] }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'page-action',
    activatesOn: ActivationEvents.Startup,
    activate: PageActionProvider,
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.id, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default BookmarksPlugin;
```

**Note on the page-action module's activation event:** `ActivationEvents.Startup` is the verified pattern for cross-plugin capability contributions — `plugin-osrm/src/OsrmPlugin.tsx:13` activates its `RoutingService` contribution the same way. The capability only needs to be contributed before plugin-crx's listener answers a list request, and the listener resolves contributions lazily per request, so Startup is safely early enough.

Empty barrels: `components/index.ts` (`export {};` placeholder comment), `containers/index.ts`, `capabilities/index.ts` (filled in later tasks), `types/index.ts`.

- [ ] **Step 4:** `HUSKY=0 CI=true pnpm install --no-frozen-lockfile`, then `moon run plugin-bookmarks:build` once types/capabilities exist (next tasks); skeleton won't build alone — proceed to Task 14 before the first build. **Commit at end of Task 14.**

### Task 14: Bookmark schema + mapping tests

**Files:**

- Create: `packages/plugins/plugin-bookmarks/src/types/{Bookmark.ts,Bookmark.test.ts}`
- Modify: `packages/plugins/plugin-bookmarks/src/types/index.ts`

- [ ] **Step 1: Failing test** (`Bookmark.test.ts`):

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Bookmark } from './index';

const snapshot = {
  source: {
    url: 'https://example.com/article',
    title: 'Tab Title',
    favicon: 'https://example.com/favicon.ico',
    clippedAt: '2026-06-09T12:00:00.000Z',
  },
  hints: {
    ogTitle: 'OG Title',
    ogDescription: 'A description.',
    ogImage: 'https://example.com/og.png',
  },
};

describe('Bookmark.fromSnapshot', () => {
  test('prefers og hints', ({ expect }) => {
    const bookmark = Bookmark.fromSnapshot(snapshot);
    expect(bookmark.title).toBe('OG Title');
    expect(bookmark.url).toBe('https://example.com/article');
    expect(bookmark.excerpt).toBe('A description.');
    expect(bookmark.image).toBe('https://example.com/og.png');
    expect(bookmark.favicon).toBe('https://example.com/favicon.ico');
  });

  test('falls back to tab title and selection text', ({ expect }) => {
    const bookmark = Bookmark.fromSnapshot({
      source: { url: 'https://a.com', title: 'Tab Title', clippedAt: '2026-06-09T12:00:00.000Z' },
      selection: { text: 'x'.repeat(400) },
    });
    expect(bookmark.title).toBe('Tab Title');
    expect(bookmark.excerpt).toHaveLength(280);
    expect(bookmark.image).toBeUndefined();
  });
});
```

- [ ] **Step 2:** Run: `moon run plugin-bookmarks:test -- src/types/Bookmark.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement** `types/Bookmark.ts` (pattern: `plugin-commerce/src/types/Result.ts`):

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';
import { type PageAction } from '@dxos/plugin-crx/types';

const EXCERPT_LENGTH = 280;

/** A saved web page. */
export const Bookmark = Schema.Struct({
  title: Schema.String.pipe(Schema.annotations({ title: 'Title' })),
  url: Schema.String.pipe(Schema.annotations({ title: 'URL' })),
  favicon: Schema.optional(Schema.String),
  image: Schema.optional(Schema.String),
  excerpt: Schema.optional(Schema.String),
  summary: Schema.optional(Schema.String),
}).pipe(
  LabelAnnotation.set(['title']),
  Annotation.IconAnnotation.set({ icon: 'ph--bookmark-simple--regular', hue: 'amber' }),
  Type.makeObject(DXN.make('org.dxos.type.bookmark', '0.1.0')),
);
export type Bookmark = Type.InstanceType<typeof Bookmark>;

export const make = (props: Obj.MakeProps<typeof Bookmark>): Bookmark => Obj.make(Bookmark, props);

/**
 * Best-effort mapping from a page-action snapshot. Missing fields are left
 * unset rather than blocking creation.
 */
export const fromSnapshot = (snapshot: PageAction.Snapshot): Bookmark =>
  make({
    title: snapshot.hints?.ogTitle ?? snapshot.source.title,
    url: snapshot.source.url,
    favicon: snapshot.source.favicon,
    image: snapshot.hints?.ogImage,
    excerpt: snapshot.hints?.ogDescription ?? snapshot.selection?.text?.slice(0, EXCERPT_LENGTH) ?? undefined,
  });
```

`types/index.ts`: `export * as Bookmark from './Bookmark';` plus `export * as BookmarkOperation from './BookmarkOperation';` (next task).

- [ ] **Step 4:** Run: `moon run plugin-bookmarks:test -- src/types/Bookmark.test.ts`. Expected: PASS. **Commit** `feat(plugin-bookmarks): package skeleton and Bookmark schema`.

### Task 15: AddFromSnapshot operation + handlers

**Files:**

- Create: `packages/plugins/plugin-bookmarks/src/types/BookmarkOperation.ts`, `src/operations/{add-from-snapshot.ts,index.ts}`, `src/capabilities/operation-handler.ts`
- Modify: `src/capabilities/index.ts`

- [ ] **Step 1:** `types/BookmarkOperation.ts` (definitions only — `operations` skill, Pattern 1):

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Database, DXN } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { PageAction } from '@dxos/plugin-crx/types';

export const AddFromSnapshot = Operation.make({
  meta: {
    key: DXN.make('org.dxos.plugin.bookmarks.operation.add-from-snapshot'),
    name: 'Add bookmark',
    description: 'Save a web page snapshot as a bookmark.',
    icon: 'ph--bookmark-simple--regular',
  },
  input: Schema.Struct({
    snapshot: PageAction.Snapshot,
    target: Database.Database.annotations({ description: 'The database to add the bookmark to.' }),
  }),
  output: Schema.Struct({
    id: Schema.String,
  }),
});
```

- [ ] **Step 2:** `operations/add-from-snapshot.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/operation';
import { SpaceOperation } from '@dxos/plugin-space';

import { Bookmark, BookmarkOperation } from '#types';

export default BookmarkOperation.AddFromSnapshot.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ snapshot, target }) {
      const bookmark = Bookmark.fromSnapshot(snapshot);
      const { id } = yield* Operation.invoke(SpaceOperation.AddObject, { object: bookmark, target });
      return { id };
    }),
  ),
);
```

(If the build hits TS2742 on the default export, append `Operation.opaqueHandler` per the operations skill. If `SpaceOperation` is exported from a subpath rather than the root, import it the way `plugin-crx/src/listener.ts` does.)

`operations/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export const BookmarkOperationHandlerSet = OperationHandlerSet.lazy(() => import('./add-from-snapshot'));
```

- [ ] **Step 3:** `capabilities/operation-handler.ts` (mirror `plugin-chess/src/capabilities/operation-handler.ts`, importing `BookmarkOperationHandlerSet` from `#operations`). Add to `capabilities/index.ts`: `export const OperationHandler = Capability.lazy('OperationHandler', () => import('./operation-handler'));`

- [ ] **Step 4:** `moon run plugin-bookmarks:build && moon run plugin-bookmarks:test`. Expected: green. **Commit** `feat(plugin-bookmarks): AddFromSnapshot operation`.

### Task 16: Page-action contribution + surfaces

**Files:**

- Create: `src/capabilities/page-action.ts`, `src/capabilities/react-surface.tsx`, `src/containers/BookmarkArticle/{BookmarkArticle.tsx,BookmarkArticle.stories.tsx,index.ts}`, `src/containers/BookmarkCard/{BookmarkCard.tsx,BookmarkCard.stories.tsx,index.ts}`
- Modify: `src/capabilities/index.ts`, `src/containers/index.ts`

- [ ] **Step 1:** `capabilities/page-action.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { CrxCapabilities } from '@dxos/plugin-crx/types';

import { meta } from '#meta';
import { BookmarkOperation } from '#types';

export default Capability.makeModule(() =>
  Effect.sync(() =>
    Capability.contributes(CrxCapabilities.PageAction, [
      {
        id: `${meta.id}/page-action/add-bookmark`,
        label: 'Add bookmark',
        icon: 'ph--bookmark-simple--regular',
        urlPatterns: ['http://*/*', 'https://*/*'],
        extractor: { name: 'snapshot' },
        contexts: ['popup', 'page'],
        operation: BookmarkOperation.AddFromSnapshot,
      },
    ]),
  ),
);
```

Note: if `Capability.lazy` on this module fails `tsc` with TS2883 (capability type declared in another package — see composer-plugins MEMORY), switch the barrel to an eager re-export: `export { default as PageActionProvider } from './page-action';`.

- [ ] **Step 2: Containers.** Before writing them, consult the **composer-ui** skill and `mcp__dxos-introspect__list_idioms` for the canonical Card/Article container patterns. `BookmarkArticle.tsx` (Panel layout, direct reactive property reads as in `ChessArticle`):

```tsx
//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Button, Icon, Panel, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { type Bookmark } from '#types';

export type BookmarkArticleProps = {
  role: string;
  subject: Bookmark.Bookmark;
};

export const BookmarkArticle = ({ role, subject }: BookmarkArticleProps) => {
  const { t } = useTranslation(meta.id);
  return (
    <Panel.Root role={role}>
      <Panel.Content classNames='p-4 flex flex-col gap-3 overflow-y-auto'>
        {subject.image && <img src={subject.image} alt='' className='max-h-64 object-cover rounded-sm' />}
        <h1 className='text-xl'>{subject.title}</h1>
        {subject.excerpt && <p className='text-description'>{subject.excerpt}</p>}
        {subject.summary && <p>{subject.summary}</p>}
        <div>
          <Button onClick={() => window.open(subject.url, '_blank', 'noopener')}>
            <Icon icon='ph--arrow-square-out--regular' size={4} classNames='mie-2' />
            {t('open-source.button')}
          </Button>
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};

export default BookmarkArticle;
```

`BookmarkCard.tsx` — use the `Card` 3-slot pattern from composer-ui (heading = title, body = excerpt, optional media = image). Each container directory's `index.ts` bridges named → default export; `containers/index.ts` uses `lazy(() => import('./X'))` with `: ComponentType<any>` annotations (copy the shape from `plugin-chess/src/containers/index.ts`). Stories: basic, building the ECHO subject inside `render` via `useMemo` (NEVER module-level args — see memory `feedback_echo_ownership_stories`), e.g. `Bookmark.make({ title: 'DXOS', url: 'https://dxos.org', excerpt: '…' })` wrapped per the echo testing memory if reactive access is needed.

- [ ] **Step 3:** `capabilities/react-surface.tsx` (pattern: `plugin-commerce/src/capabilities/react-surface.tsx`):

```tsx
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { BookmarkArticle, BookmarkCard } from '#containers';
import { Bookmark } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'bookmarkArticle',
        filter: AppSurface.object(AppSurface.Article, Bookmark.Bookmark),
        component: ({ data, role }) => <BookmarkArticle role={role ?? 'article'} subject={data.subject} />,
      }),
      Surface.create({
        id: 'bookmarkCard',
        filter: AppSurface.object(AppSurface.Card, Bookmark.Bookmark),
        component: ({ data }) => <BookmarkCard subject={data.subject} />,
      }),
    ]),
  ),
);
```

(Verify the exact `Surface.create` filter/component prop shapes against `plugin-commerce/src/capabilities/react-surface.tsx` at implementation time and match them.)

Add to `capabilities/index.ts`: `ReactSurface` lazy export.

- [ ] **Step 4:** `moon run plugin-bookmarks:build && moon run plugin-bookmarks:lint -- --fix && moon run plugin-bookmarks:test`. Expected: green. **Commit** `feat(plugin-bookmarks): page action and surfaces`.

### Task 17: Register in composer-app + integration

**Files:**

- Modify: `packages/apps/composer-app/src/plugin-defs.tsx` (import `BookmarksPlugin` from `@dxos/plugin-bookmarks/plugin`; add `BookmarksPlugin(),` in the alphabetical position before `CallsPlugin()`), `packages/apps/composer-app/package.json` (`"@dxos/plugin-bookmarks": "workspace:*"`), `packages/apps/composer-app/tsconfig.json` (reference `../../plugins/plugin-bookmarks`)

- [ ] **Step 1:** Make the edits; `HUSKY=0 CI=true pnpm install --no-frozen-lockfile`.
- [ ] **Step 2:** `moon run composer-app:build`. Expected: green.
- [ ] **Step 3: Commit** `feat: register plugin-bookmarks in composer-app`.

### Task 18: End-to-end verification + final checks

- [ ] **Step 1: Targeted builds/tests.** `moon run plugin-crx:build plugin-bookmarks:build composer-crx:build composer-app:build` then `moon run plugin-crx:test plugin-bookmarks:test composer-crx:test`. Expected: all green.
- [ ] **Step 2: Manual e2e.** Build the extension (`moon run composer-crx:build`, output under `packages/apps/composer-crx/out/composer-crx`), load unpacked in Chrome, serve composer (`moon run composer-app:serve`, reuse the user's running instance if present — never kill their servers), configure the extension's Composer URL to the dev origin (Options page). Then: open the Composer tab (registry refresh fires), browse to any article page, open the extension popup → "Add bookmark" button visible → click → Composer shows the "Add bookmark done" toast and a Bookmark object exists in the active space with title/image/excerpt. Also verify the no-tab path: close the Composer tab, invoke again → a tab opens and the bookmark lands after boot.
- [ ] **Step 3: Cast audit (required by CLAUDE.md).** `git diff origin/main | grep -nE '\bas (any|unknown|[A-Z])|as unknown as'` — justify or remove every new hit.
- [ ] **Step 4: Repo-wide lint + format.** `moon run :lint -- --fix` (at minimum for the touched projects) and `pnpm format`.
- [ ] **Step 5: Update skill memory.** Append session learnings to `.claude/skills/composer-plugins/MEMORY.md` (e.g. cross-plugin PageAction capability pattern, extension wire-mirror convention).
- [ ] **Step 6: Commit** any remaining changes; verify `git status` is clean.

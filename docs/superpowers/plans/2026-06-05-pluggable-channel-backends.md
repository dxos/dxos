# Pluggable Channel Backends — Implementation Plan (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a `ChannelBackend` capability so a `Channel` can be served by pluggable message backends, with the existing local ECHO `Feed` refactored to register as the first provider (behavior-preserving).

**Architecture:** The `Channel` schema drops its hard-wired `feed: Ref(Feed)` in favour of `backend: { kind: string; config: Ref(Obj.Any) }`. Plugins contribute `ChannelBackend` provider entries (collected via `Capability.getAll`) exposing a reactive `subscribe(channel)` read, an Effectful `send(channel, message)`, a `createFields` schema for the create form, and a `makeConfig` factory. plugin-thread owns one agnostic `ChannelChat` container that resolves the provider by `channel.backend.kind`, a `useMessages` hook over the provider's subscribe, and a provider-driven create panel.

**Tech Stack:** TypeScript, Effect-TS, `@dxos/echo` (ECHO reactive queries), `@dxos/app-framework` capabilities, `@dxos/react-ui-form` (discriminated-union forms), vitest.

**Spec:** `docs/superpowers/specs/2026-06-05-pluggable-channel-backends-design.md`

---

## File structure

**`@dxos/types` (packages/sdk/types)**

- Modify: `src/types/Channel.ts` — replace `feed` with `backend`; bump `0.1.0 → 0.2.0`; add `FeedBackendKind` constant, `getFeed` helper; drop `FeedAnnotation`.

**`@dxos/plugin-thread` (packages/plugins/plugin-thread)**

- Modify: `src/types/ThreadCapabilities.ts` — add `ChannelBackend` capability + `ChannelBackendProvider` interface.
- Create: `src/types/channel-backend.ts` — pure `buildChannelFormSchema(providers)` + `resolveProvider(providers, kind)` helpers (+ test).
- Create: `src/capabilities/channel-backend-feed.ts` — Feed provider module.
- Create: `src/hooks/useMessages.ts` — provider-resolving reactive read hook.
- Modify: `src/hooks/index.ts` — export `useMessages`.
- Create: `src/containers/ChannelChat/ChannelCreatePanel.tsx` — provider-driven create panel.
- Modify: `src/containers/ChannelChat/ChannelChat.tsx` — use `useMessages`, provider-driven `readOnly`.
- Modify: `src/operations/append-channel-message.ts` — delegate `send` to provider.
- Modify: `src/operations/create-channel.ts` — accept backend kind + config options.
- Modify: `src/types/ThreadOperation.ts` — extend `CreateChannel` input.
- Modify: `src/capabilities/create-object.ts` — wire `customPanel` + backend-aware `createObject`.
- Modify: `src/capabilities/index.ts` + `src/ThreadPlugin.tsx` / `.node.ts` / `.workerd.ts` — register the Feed provider module.
- Modify: `src/containers/ChannelArticle/ChannelArticle.stories.tsx` — feed access via new shape.
- Create: `src/capabilities/channel-backend-feed.test.ts` — Feed provider send/subscribe.

**`@dxos/plugin-slack`, `@dxos/plugin-discord`**

- Modify: `src/operations/sync.ts` — load feed config from `channel.backend.config` with an `Obj.instanceOf` narrow.

---

## Conventions for every task

- Tests: vitest, `describe`/`test`, `test('…', ({ expect }) => …)`, file next to module as `*.test.ts`.
- Run a single test file: `moon run <package>:test -- <relative/path/to/test>`.
- Typecheck/build a package: `moon run <package>:build`.
- Lint: `moon run <package>:lint -- --fix`.
- Single quotes; arrow functions; comments end with a period; no casts to silence types (`as const` excepted).
- `@dxos` workspace deps are `workspace:*`.

---

## Task 1: Channel schema — replace `feed` with `backend`

**Files:**

- Modify: `packages/sdk/types/src/types/Channel.ts`
- Test: `packages/sdk/types/src/types/Channel.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `packages/sdk/types/src/types/Channel.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Feed, Obj } from '@dxos/echo';

import * as Channel from './Channel';

describe('Channel', () => {
  test('make() defaults to the feed backend with a Feed config', ({ expect }) => {
    const channel = Channel.make({ name: 'general' });
    expect(channel.name).to.eq('general');
    expect(channel.backend.kind).to.eq(Channel.FeedBackendKind);
    const config = channel.backend.config.target;
    expect(Obj.instanceOf(Feed.Feed, config)).to.be.true;
  });

  test('getFeed() returns the feed config for a feed-backed channel', ({ expect }) => {
    const channel = Channel.make({ name: 'general' });
    expect(Obj.instanceOf(Feed.Feed, Channel.getFeed(channel))).to.be.true;
  });

  test('make() accepts an explicit backend', ({ expect }) => {
    const feed = Feed.make();
    const channel = Channel.make({ name: 'x', backend: { kind: 'org.dxos.channel.backend.test', config: feed } });
    expect(channel.backend.kind).to.eq('org.dxos.channel.backend.test');
    expect(channel.backend.config.target).to.eq(feed);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run types:test -- src/types/Channel.test.ts`
Expected: FAIL (`backend` undefined / `FeedBackendKind` not exported).

- [ ] **Step 3: Rewrite `Channel.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Feed, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';

/** Backend kind for the default local-feed-backed channel. */
export const FeedBackendKind = 'org.dxos.channel.backend.feed';

/**
 * Multi-party conversation backed by a pluggable backend.
 *
 * The `backend.kind` discriminator names the provider (e.g. the local feed,
 * an ATProto channel); `backend.config` references a provider-owned config
 * object (a `Feed` for the default backend). Providers are contributed via the
 * `ChannelBackend` capability in `@dxos/plugin-thread`.
 */
export const Channel = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  backend: Schema.Struct({
    /** Provider id; see `ChannelBackendProvider.kind`. */
    kind: Schema.String,
    /** Provider-owned config object (a `Feed` for the default backend). */
    config: Ref.Ref(Obj.Any),
  }).pipe(FormInputAnnotation.set(false)),
}).pipe(
  Annotation.IconAnnotation.set({ icon: 'ph--hash--regular', hue: 'rose' }),
  Type.makeObject(DXN.make('org.dxos.type.channel', '0.2.0')),
);

export type Channel = Type.InstanceType<typeof Channel>;
export const instanceOf = (value: unknown): value is Channel => Obj.instanceOf(Channel, value);

type ChannelProps = Omit<Obj.MakeProps<typeof Channel>, 'backend'> & {
  /** Optional explicit backend; defaults to a new local feed. */
  backend?: { kind: string; config: Obj.Any };
};

/** Creates a channel object, defaulting to a local feed-backed backend. */
export const make = ({ backend, ...rest }: ChannelProps = {}) => {
  const resolved = backend ?? { kind: FeedBackendKind, config: Feed.make() };
  const channel = Obj.make(Channel, {
    backend: { kind: resolved.kind, config: Ref.make(resolved.config) },
    ...rest,
  });
  // TODO(wittjosiah): Parent should be declarative in the schema.
  Obj.setParent(resolved.config, channel);
  return channel;
};

/** Returns the backing `Feed` for a feed-backed channel (when loaded), else undefined. */
export const getFeed = (channel: Channel): Feed.Feed | undefined => {
  const config = channel.backend.config?.target;
  return Obj.instanceOf(Feed.Feed, config) ? config : undefined;
};
```

Note: `FeedAnnotation` is intentionally dropped from `Channel` — a channel is no longer universally feed-backed. This removes channels from `FeedAnnotation`-based automation trigger discovery (see Task 11 verification). `Obj.Any` is the schema for "any ECHO object" (confirm exact export name from `@dxos/echo` during Step 4; if it is `Obj.Any` use it, otherwise `Type.Expando`/`Obj.Unknown` — pick the one used elsewhere for open refs).

- [ ] **Step 4: Run test to verify it passes**

Run: `moon run types:test -- src/types/Channel.test.ts`
Expected: PASS. Fix the `Obj.Any` ref-target type if the build complains (use whatever `@dxos/echo` exports for an open object schema; grep `Ref.Ref(Obj.` in the repo for precedent).

- [ ] **Step 5: Build the package**

Run: `moon run types:build`
Expected: clean (no type errors). The only in-package consumers of `Channel` are re-exports; downstream breakage is handled in later tasks.

- [ ] **Step 6: Commit**

```bash
git add packages/sdk/types/src/types/Channel.ts packages/sdk/types/src/types/Channel.test.ts
git commit -m "feat(types): replace Channel.feed with pluggable backend descriptor"
```

---

## Task 2: `ChannelBackend` capability + provider interface

**Files:**

- Modify: `packages/plugins/plugin-thread/src/types/ThreadCapabilities.ts`

- [ ] **Step 1: Add the capability + interface**

Append to `ThreadCapabilities.ts` (keep existing imports; add `Channel`, `Message` from `@dxos/types`, `Schema` from `effect/Schema`):

```ts
/**
 * A pluggable message backend for a `Channel`. Providers are contributed by
 * plugins and resolved by `Channel.backend.kind`.
 */
export interface ChannelBackendProvider {
  /** Stable backend id; matches `Channel.backend.kind`. */
  kind: string;
  /** Human-readable label shown in the create-channel form. */
  label: string;
  /** Icon name (phosphor) for the create-channel form. */
  icon?: string;
  /**
   * Per-backend create-form inputs (excludes the `kind` discriminant and the
   * channel `name`, which the panel adds). Empty struct when the backend needs
   * no extra input (e.g. the local feed).
   */
  createFields: Schema.Struct<any>;
  /** Builds the provider's config object from the collected create-form inputs. */
  makeConfig: (options: Record<string, unknown>) => Obj.Any;
  /**
   * Subscribes to the channel's messages. Calls `onMessages` with the current
   * list immediately and on every change. Returns an unsubscribe function.
   */
  subscribe: (channel: Channel.Channel, onMessages: (messages: readonly Message.Message[]) => void) => () => void;
  /** Sends a message through the backend. */
  send: (channel: Channel.Channel, message: Message.Message) => Effect.Effect<void, Error, Capability.Service>;
  /** Whether the channel is read-only. Defaults to "channel has foreign-key Obj.Meta". */
  readOnly?: (channel: Channel.Channel) => boolean;
}

/** Registry of channel-message backends. Collect with `Capability.getAll`. */
export const ChannelBackend = Capability.make<ChannelBackendProvider>(`${meta.id}.capability.channel-backend`);
```

Add to the import block at the top: `import * as Schema from 'effect/Schema';` and extend the `@dxos/types` import to `import { type Channel, type Message, type Thread } from '@dxos/types';` and `@dxos/echo` to include `Obj` as a value (it is currently `type Obj`; `Obj.Any` is a type usage so `type` is fine — keep `type Obj`).

- [ ] **Step 2: Build**

Run: `moon run plugin-thread:build`
Expected: may fail later tasks' references, but this file compiles. If `Capability.make` for a single-entry-collected-via-getAll needs an array type, follow the `IntegrationProvider` precedent (`Capability.make<Entry[]>`) — but `getAll` collects individual contributions, so single-entry `Capability.make<ChannelBackendProvider>` + `Capability.getAll` is correct. Verify against `SpaceCapabilities.CreateObjectEntry` which is `Capability.make<CreateObjectEntry>` and read via `.getAll`.

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/plugin-thread/src/types/ThreadCapabilities.ts
git commit -m "feat(plugin-thread): add ChannelBackend capability and provider interface"
```

---

## Task 3: `buildChannelFormSchema` + `resolveProvider` helpers (pure)

**Files:**

- Create: `packages/plugins/plugin-thread/src/types/channel-backend.ts`
- Test: `packages/plugins/plugin-thread/src/types/channel-backend.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';

import { buildChannelFormSchema, resolveProvider } from './channel-backend';
import { type ChannelBackendProvider } from './ThreadCapabilities';

const fakeProvider = (kind: string, fields: Schema.Struct<any>): ChannelBackendProvider => ({
  kind,
  label: kind,
  createFields: fields,
  makeConfig: () => Obj.make(Schema.Struct({}), {}),
  subscribe: () => () => {},
  send: () => undefined as any,
});

describe('channel-backend helpers', () => {
  test('resolveProvider finds by kind', ({ expect }) => {
    const providers = [fakeProvider('a', Schema.Struct({})), fakeProvider('b', Schema.Struct({}))];
    expect(resolveProvider(providers, 'b')?.kind).to.eq('b');
    expect(resolveProvider(providers, 'missing')).to.be.undefined;
  });

  test('buildChannelFormSchema produces a struct with name + discriminated backend union', ({ expect }) => {
    const providers = [
      fakeProvider('feed', Schema.Struct({})),
      fakeProvider('atproto', Schema.Struct({ channelId: Schema.String })),
    ];
    const schema = buildChannelFormSchema(providers);
    // Decodes a feed selection.
    const feedValue = Schema.decodeUnknownSync(schema)({ name: 'x', backend: { kind: 'feed' } });
    expect(feedValue.backend.kind).to.eq('feed');
    // Decodes an atproto selection with its extra field.
    const atValue = Schema.decodeUnknownSync(schema)({ name: 'y', backend: { kind: 'atproto', channelId: 'c' } });
    expect(atValue.backend.kind).to.eq('atproto');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `moon run plugin-thread:test -- src/types/channel-backend.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the helpers**

Create `channel-backend.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type ChannelBackendProvider } from './ThreadCapabilities';

/** Finds the provider matching a `Channel.backend.kind`. */
export const resolveProvider = (
  providers: readonly ChannelBackendProvider[],
  kind: string,
): ChannelBackendProvider | undefined => providers.find((provider) => provider.kind === kind);

/**
 * Builds the create-channel form schema from the registered providers:
 * `{ name?, backend: Union(<{ kind: Literal(p.kind), ...p.createFields }> per provider) }`.
 * react-ui-form renders `backend.kind` as a Select and the selected branch's fields.
 */
export const buildChannelFormSchema = (providers: readonly ChannelBackendProvider[]): Schema.Schema.AnyNoContext => {
  const branches = providers.map((provider) =>
    Schema.Struct({ kind: Schema.Literal(provider.kind), ...provider.createFields.fields }),
  );
  const backend =
    branches.length === 1 ? branches[0] : Schema.Union(...(branches as [Schema.Struct<any>, ...Schema.Struct<any>[]]));
  return Schema.Struct({
    name: Schema.optional(Schema.String),
    backend,
  });
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `moon run plugin-thread:test -- src/types/channel-backend.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-thread/src/types/channel-backend.ts packages/plugins/plugin-thread/src/types/channel-backend.test.ts
git commit -m "feat(plugin-thread): channel backend form-schema + resolution helpers"
```

---

## Task 4: Feed backend provider

**Files:**

- Create: `packages/plugins/plugin-thread/src/capabilities/channel-backend-feed.ts`
- Test: `packages/plugins/plugin-thread/src/capabilities/channel-backend-feed.test.ts`

- [ ] **Step 1: Write the failing test** (subscribe + send round-trip against an in-memory client)

Mirror the existing plugin-thread operation tests for client/space setup (grep for `createFeedServiceLayer` and existing tests that build a `Client`; reuse that harness). The test:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Filter, Obj, Query } from '@dxos/echo';
import { Channel, Message } from '@dxos/types';

import { feedChannelBackend } from './channel-backend-feed';

describe('feed channel backend', () => {
  test('makeConfig builds a Feed; subscribe reflects appended messages', async ({ expect }) => {
    // Build a Client + space (follow existing plugin-thread test harness).
    // const { space } = await setup();
    const channel = Channel.make({ name: 'general' });
    // space.db.add(channel);
    const seen: (readonly Message.Message[])[] = [];
    const unsubscribe = feedChannelBackend.subscribe(channel, (messages) => seen.push(messages));
    // Append via the feed config and assert the subscriber observes it.
    // ... (use space.db + Feed.append with createFeedServiceLayer(space.queues))
    unsubscribe();
    expect(feedChannelBackend.kind).to.eq(Channel.FeedBackendKind);
  });
});
```

NOTE: If a full Client harness is heavy, scope this test to the pure bits — `kind`, `makeConfig()` returns a `Feed`, `readOnly` reflects foreign keys — and cover subscribe/send via the existing channel operation integration test (Task 9). Keep at least the pure-assertions test here.

- [ ] **Step 2: Run to verify it fails**

Run: `moon run plugin-thread:test -- src/capabilities/channel-backend-feed.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the Feed provider**

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Database, Feed, Filter, Obj, Query } from '@dxos/echo';
import { createFeedServiceLayer } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Channel, Message } from '@dxos/types';

import { type ChannelBackendProvider } from '../types';

/** Local ECHO-feed-backed channel provider (the default backend). */
export const feedChannelBackend: ChannelBackendProvider = {
  kind: Channel.FeedBackendKind,
  label: 'Feed',
  icon: 'ph--rows--regular',
  createFields: (await import('effect/Schema')).Struct({}), // replaced below — see note
  makeConfig: () => Feed.make(),
  subscribe: (channel, onMessages) => {
    const feed = Channel.getFeed(channel);
    const db = Obj.getDatabase(channel);
    if (!feed || !db) {
      onMessages([]);
      return () => {};
    }
    const result = db.query(Query.select(Filter.type(Message.Message)).from(feed));
    return result.subscribe(() => onMessages(result.results), { fire: true });
  },
  send: (channel, message) =>
    Effect.gen(function* () {
      const db = Obj.getDatabase(channel);
      invariant(db, 'Database not found');
      const client = yield* Capability.get(ClientCapabilities.Client);
      const space = client.spaces.get(db.spaceId);
      invariant(space, 'Space not found');
      const feed = Channel.getFeed(channel);
      invariant(feed, 'Channel is not feed-backed');
      yield* Feed.append(feed, [message]).pipe(Effect.provide(createFeedServiceLayer(space.queues)));
    }),
  readOnly: (channel) => Obj.getMeta(channel).keys.length > 0,
};
```

Fix the `createFields` line — do not dynamic-import. Import `Schema` at top: `import * as Schema from 'effect/Schema';` and set `createFields: Schema.Struct({})`.

The module that contributes it:

```ts
export const ChannelBackendFeed = Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(ThreadCapabilities.ChannelBackend, feedChannelBackend);
  }),
);
```

Add the needed imports (`ThreadCapabilities` from `../types`). Export both `feedChannelBackend` and the default module. Place `export default ChannelBackendFeed;` at the end (follow the module pattern in `create-object.ts`).

- [ ] **Step 4: Run to verify it passes**

Run: `moon run plugin-thread:test -- src/capabilities/channel-backend-feed.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-thread/src/capabilities/channel-backend-feed.ts packages/plugins/plugin-thread/src/capabilities/channel-backend-feed.test.ts
git commit -m "feat(plugin-thread): feed channel backend provider"
```

---

## Task 5: `useMessages` hook

**Files:**

- Create: `packages/plugins/plugin-thread/src/hooks/useMessages.ts`
- Modify: `packages/plugins/plugin-thread/src/hooks/index.ts`

- [ ] **Step 1: Implement the hook**

```ts
//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { useCapabilities } from '@dxos/app-framework';
import { type Channel, type Message } from '@dxos/types';

import { ThreadCapabilities, resolveProvider } from '../types';

const EMPTY: readonly Message.Message[] = [];

/** Reactive message list for a channel, resolved through its backend provider. */
export const useMessages = (channel: Channel.Channel): readonly Message.Message[] => {
  const providers = useCapabilities(ThreadCapabilities.ChannelBackend);
  const provider = useMemo(() => resolveProvider(providers, channel.backend.kind), [providers, channel.backend.kind]);

  let snapshot: readonly Message.Message[] = EMPTY;
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!provider) {
        return () => {};
      }
      return provider.subscribe(channel, (messages) => {
        snapshot = messages;
        onChange();
      });
    },
    [provider, channel],
  );

  return useSyncExternalStore(subscribe, () => snapshot);
};
```

NOTE: `useSyncExternalStore` requires a stable `getSnapshot`. The closure-over-`snapshot` pattern re-creates `snapshot` per render and can tear. Use a `useRef` to hold the latest snapshot instead:

```ts
const ref = useRef<readonly Message.Message[]>(EMPTY);
const subscribe = useCallback(
  (onChange: () => void) => {
    if (!provider) return () => {};
    return provider.subscribe(channel, (messages) => {
      ref.current = messages;
      onChange();
    });
  },
  [provider, channel],
);
return useSyncExternalStore(subscribe, () => ref.current);
```

Use the `useRef` form. Confirm `useCapabilities` is the correct hook name exported from `@dxos/app-framework` (grep `useCapabilities` in the repo; if it is `useCapabilities`/`useCapability` adjust — there is precedent in other plugin containers).

- [ ] **Step 2: Export it**

Add to `src/hooks/index.ts`: `export * from './useMessages';`

- [ ] **Step 3: Build**

Run: `moon run plugin-thread:build`
Expected: compiles (other call sites updated in later tasks may still reference old shapes — if build fails only in `ChannelChat`/operations, that is expected and fixed in Tasks 6–8).

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-thread/src/hooks/useMessages.ts packages/plugins/plugin-thread/src/hooks/index.ts
git commit -m "feat(plugin-thread): useMessages hook over channel backend providers"
```

---

## Task 6: `ChannelChat` — use `useMessages` + provider-driven readOnly

**Files:**

- Modify: `packages/plugins/plugin-thread/src/containers/ChannelChat/ChannelChat.tsx`

- [ ] **Step 1: Replace the feed query + readOnly**

Replace the body that computes `feed`/`messages`/`readOnly`:

```tsx
import { useMessages } from '#hooks';
import { ThreadCapabilities, resolveProvider } from '#types';
import { useCapabilities } from '@dxos/app-framework';

// inside the component:
const providers = useCapabilities(ThreadCapabilities.ChannelBackend);
const provider = resolveProvider(providers, channel.backend.kind);
const messages = useMessages(channel);
const readOnly = provider?.readOnly?.(channel) ?? Obj.getMeta(channel).keys.length > 0;
```

Remove the now-unused `Filter`, `Query`, `useQuery`, `space.db` query, and `Message` import if no longer referenced. Keep `space`/`members`/`activity`/`handleSend` as-is. Keep the existing `useCallback` dependency fix (`[]` → include `readOnly, channel, identity, invokePromise`).

- [ ] **Step 2: Build**

Run: `moon run plugin-thread:build`
Expected: compiles (operations updated next).

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/plugin-thread/src/containers/ChannelChat/ChannelChat.tsx
git commit -m "feat(plugin-thread): ChannelChat reads via useMessages + backend provider"
```

---

## Task 7: `AppendChannelMessage` — delegate to provider

**Files:**

- Modify: `packages/plugins/plugin-thread/src/operations/append-channel-message.ts`

- [ ] **Step 1: Rewrite the handler to resolve the provider**

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { invariant } from '@dxos/invariant';
import { Message } from '@dxos/types';

import { ThreadCapabilities, ThreadOperation, resolveProvider } from '../types';

const handler: Operation.WithHandler<typeof ThreadOperation.AppendChannelMessage> =
  ThreadOperation.AppendChannelMessage.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ channel, sender, text }) {
        const providers = yield* Capability.getAll(ThreadCapabilities.ChannelBackend);
        const provider = resolveProvider(providers, channel.backend.kind);
        invariant(provider, `No channel backend for kind: ${channel.backend.kind}`);
        const message = Message.make({ sender, blocks: [{ _tag: 'text', text }] });
        yield* provider.send(channel, message);
      }),
    ),
  );

export default handler;
```

Confirm `Capability.getAll` is available on the operation's `Capability.Service` (the operation already declares `services: [Capability.Service]`). If `getAll` is only on the React side, use the operations-side equivalent (grep how other operation handlers read multi-contributions — e.g. anything using `Capability.getAll` inside an `Operation.withHandler`).

- [ ] **Step 2: Build + run channel op tests**

Run: `moon run plugin-thread:build` then `moon run plugin-thread:test`
Expected: compiles; existing channel message tests pass (they exercise append→read).

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/plugin-thread/src/operations/append-channel-message.ts
git commit -m "feat(plugin-thread): AppendChannelMessage delegates to backend provider"
```

---

## Task 8: Provider-driven create flow

**Files:**

- Modify: `packages/plugins/plugin-thread/src/types/ThreadOperation.ts`
- Modify: `packages/plugins/plugin-thread/src/operations/create-channel.ts`
- Create: `packages/plugins/plugin-thread/src/containers/ChannelChat/ChannelCreatePanel.tsx`
- Modify: `packages/plugins/plugin-thread/src/capabilities/create-object.ts`

- [ ] **Step 1: Extend the `CreateChannel` operation input**

In `ThreadOperation.ts`, change `CreateChannel.input` to:

```ts
input: Schema.Struct({
  spaceId: Key.SpaceId,
  name: Schema.optional(Schema.String),
  kind: Schema.optional(Schema.String),
  /** Per-backend create-form options passed to the provider's makeConfig. */
  options: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
}),
```

- [ ] **Step 2: Rewrite `create-channel.ts` to use the provider**

```ts
//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { invariant } from '@dxos/invariant';
import { Channel } from '@dxos/types';

import { ThreadCapabilities, ThreadOperation, resolveProvider } from '../types';

const handler: Operation.WithHandler<typeof ThreadOperation.CreateChannel> = ThreadOperation.CreateChannel.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, kind, options }) {
      if (!kind || kind === Channel.FeedBackendKind) {
        return { object: Channel.make({ name }) };
      }
      const providers = yield* Capability.getAll(ThreadCapabilities.ChannelBackend);
      const provider = resolveProvider(providers, kind);
      invariant(provider, `No channel backend for kind: ${kind}`);
      const config = provider.makeConfig(options ?? {});
      return { object: Channel.make({ name, backend: { kind, config } }) };
    }),
  ),
);

export default handler;
```

Add `services: [Capability.Service]` to `CreateChannel` in `ThreadOperation.ts` if not present (needed for `Capability.getAll`).

- [ ] **Step 3: Create `ChannelCreatePanel.tsx`** (provider-driven custom panel)

Follow `packages/plugins/plugin-game/src/components/CreateGamePanel.tsx`. Single-stage: read providers, render the assembled union form.

```tsx
//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useCapabilities } from '@dxos/app-framework';
import { type SpaceCapabilities } from '@dxos/plugin-space';
import { Form } from '@dxos/react-ui-form';
import { Column } from '@dxos/react-ui-stack'; // confirm the layout primitive CreateGamePanel uses

import { ThreadCapabilities, buildChannelFormSchema } from '#types';

export const ChannelCreatePanel = ({ onCreateObject }: SpaceCapabilities.CreateObjectCustomPanelProps) => {
  const providers = useCapabilities(ThreadCapabilities.ChannelBackend);
  const schema = useMemo(() => buildChannelFormSchema(providers), [providers]);

  const handleSave = useCallback(
    (values: any) => {
      const { name, backend } = values;
      const { kind, ...options } = backend ?? {};
      void onCreateObject({ name, kind, options });
    },
    [onCreateObject],
  );

  return (
    <Column.Center>
      <Form.Root autoFocus schema={schema} defaultValues={{}} onSave={handleSave} testId='create-channel-form'>
        <Form.Content>
          <Form.FieldSet />
          <Form.Submit />
        </Form.Content>
      </Form.Root>
    </Column.Center>
  );
};
```

Match the exact `Form`/layout imports and props to `CreateGamePanel.tsx` (it is the canonical example). If `Column.Center` is from a different package there, copy that import.

- [ ] **Step 4: Wire `create-object.ts`**

```ts
//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { SpaceCapabilities, SpaceOperation } from '@dxos/plugin-space';
import { Channel } from '@dxos/types';

import { ChannelCreatePanel } from '../containers/ChannelChat/ChannelCreatePanel';
import { ThreadOperation } from '../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Channel.Channel),
      customPanel: ChannelCreatePanel,
      createObject: (
        { name, kind, options }: { name?: string; kind?: string; options?: Record<string, unknown> },
        opts,
      ) =>
        Effect.gen(function* () {
          const { object } = yield* Operation.invoke(ThreadOperation.CreateChannel, {
            spaceId: (opts.target as any).spaceId ?? undefined, // confirm spaceId source from CreateOptions target
            name,
            kind,
            options,
          });
          return yield* Operation.invoke(SpaceOperation.AddObject, {
            object,
            target: opts.target,
            hidden: true,
            targetNodeId: opts.targetNodeId,
          });
        }),
    });
  }),
);
```

The `spaceId` plumbing: the original `create-object.ts` does not call `CreateChannel` — it calls `Channel.make` directly then `AddObject`. To avoid the `spaceId`/cast problem, prefer keeping `createObject` building the Channel directly via the resolved provider (no `CreateChannel` op):

```ts
createObject: ({ name, kind, options }, opts) =>
  Effect.gen(function* () {
    const providers = yield* Capability.getAll(ThreadCapabilities.ChannelBackend);
    const provider = kind ? resolveProvider(providers, kind) : undefined;
    const object = provider
      ? Channel.make({ name, backend: { kind: provider.kind, config: provider.makeConfig(options ?? {}) } })
      : Channel.make({ name });
    return yield* Operation.invoke(SpaceOperation.AddObject, {
      object,
      target: opts.target,
      hidden: true,
      targetNodeId: opts.targetNodeId,
    });
  }),
```

Use this second form (no `CreateChannel` invocation, no `spaceId` cast). Keep `CreateChannel` operation changes from Steps 1–2 for programmatic callers, but the UI create path uses the provider directly here. Import `ThreadCapabilities, resolveProvider` from `../types`.

- [ ] **Step 5: Build + lint**

Run: `moon run plugin-thread:build` then `moon run plugin-thread:lint -- --fix`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/plugin-thread/src/types/ThreadOperation.ts packages/plugins/plugin-thread/src/operations/create-channel.ts packages/plugins/plugin-thread/src/containers/ChannelChat/ChannelCreatePanel.tsx packages/plugins/plugin-thread/src/capabilities/create-object.ts
git commit -m "feat(plugin-thread): provider-driven create-channel form"
```

---

## Task 9: Register the Feed provider module in the plugin

**Files:**

- Modify: `packages/plugins/plugin-thread/src/capabilities/index.ts`
- Modify: `packages/plugins/plugin-thread/src/ThreadPlugin.tsx`
- Modify: `packages/plugins/plugin-thread/src/ThreadPlugin.node.ts`
- Modify: `packages/plugins/plugin-thread/src/ThreadPlugin.workerd.ts`

- [ ] **Step 1: Export the capability module**

In `capabilities/index.ts`, add an export for the Feed backend module (match existing style, e.g. `export { default as ChannelBackendFeed } from './channel-backend-feed';`).

- [ ] **Step 2: Register in each plugin variant**

In `ThreadPlugin.tsx` (and `.node.ts`, `.workerd.ts`), add a module that contributes the Feed provider on `ActivationEvents.Startup` (so it is present before any create panel renders / any send runs):

```ts
Plugin.addModule({
  id: 'channel-backend-feed',
  activatesOn: ActivationEvents.Startup,
  activate: ChannelBackendFeed,
}),
```

Add `ChannelBackendFeed` to the `#capabilities` import. Check `.node.ts`/`.workerd.ts` structure (they may compose a subset — add only where the channel feature is present; grep the variants for `ReactSurface`/`CreateObject` registration to mirror placement).

- [ ] **Step 3: Build all three variants**

Run: `moon run plugin-thread:build`
Expected: clean.

- [ ] **Step 4: Run the full plugin-thread test suite**

Run: `moon run plugin-thread:test`
Expected: PASS (channel send/read regression covered by existing tests + Task 4).

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-thread/src/capabilities/index.ts packages/plugins/plugin-thread/src/ThreadPlugin.tsx packages/plugins/plugin-thread/src/ThreadPlugin.node.ts packages/plugins/plugin-thread/src/ThreadPlugin.workerd.ts
git commit -m "feat(plugin-thread): register feed channel backend provider"
```

---

## Task 10: Update `ChannelArticle` story + stragglers in plugin-thread

**Files:**

- Modify: `packages/plugins/plugin-thread/src/containers/ChannelArticle/ChannelArticle.stories.tsx`

- [ ] **Step 1: Replace `channel.feed.load()`**

Line ~72 uses `yield* Effect.promise(() => channel.feed.load())`. Replace with the new shape:

```ts
const feed = yield * Effect.promise(() => channel.backend.config.load());
```

If the story appends seed messages, ensure `feed` is the Feed config (it is, for a default channel). Adjust any other `channel.feed` references in the file.

- [ ] **Step 2: grep for remaining `channel.feed` / `.feed?.target` inside plugin-thread**

Run: `cd packages/plugins/plugin-thread && grep -rn "\.feed" src | grep -i channel`
Expected: no remaining references to `channel.feed` (only `getFeed`/`backend.config`).

- [ ] **Step 3: Build + start storybook to eyeball**

Run: `moon run plugin-thread:build`. The user runs storybook on :9009 — do NOT kill it; if needed start on another port to verify the Channel stories render and messages appear.

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-thread/src/containers/ChannelArticle/ChannelArticle.stories.tsx
git commit -m "refactor(plugin-thread): update channel stories for backend config"
```

---

## Task 11: Migrate slack + discord feed access

**Files:**

- Modify: `packages/plugins/plugin-slack/src/operations/sync.ts`
- Modify: `packages/plugins/plugin-discord/src/operations/sync.ts`

- [ ] **Step 1: Replace `Database.load(targetChannel.feed)` in slack (line ~354)**

```ts
const feed = yield * Database.load(targetChannel.backend.config);
invariant(Obj.instanceOf(Feed.Feed, feed), 'Channel is not feed-backed');
yield * Feed.append(feed, mapped);
```

Ensure `Feed`, `Obj` from `@dxos/echo` and `invariant` from `@dxos/invariant` are imported (Feed/Obj likely already are). `Channel.make({ [Obj.Meta]: …, name })` at line ~149 is unchanged (defaults to feed backend).

- [ ] **Step 2: Same change in discord (line ~389)**

```ts
const feed = yield * Database.load(targetChannel.backend.config);
invariant(Obj.instanceOf(Feed.Feed, feed), 'Channel is not feed-backed');
yield * Feed.append(feed, mapped);
```

- [ ] **Step 3: Build + test both**

Run: `moon run plugin-slack:build && moon run plugin-discord:build`
Then: `moon run plugin-slack:test && moon run plugin-discord:test`
Expected: clean + green.

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-slack/src/operations/sync.ts packages/plugins/plugin-discord/src/operations/sync.ts
git commit -m "refactor(slack,discord): read channel feed via backend config"
```

---

## Task 12: Repo-wide verification

- [ ] **Step 1: Find any remaining `channel.feed` / `Channel` feed assumptions repo-wide**

Run: `cd /Users/burdon/Code/dxos/dxos/.claude/worktrees/amazing-hopper-bbde8d && grep -rn "\.feed" packages --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -iE "channel|targetChannel"`
Expected: zero hits referencing the thread `Channel`'s old `feed` field. Fix any stragglers (e.g. meeting/calls if they turn out to read it — earlier audit says they do not).

- [ ] **Step 2: Confirm FeedAnnotation removal has no crash sites**

The automation/assistant discovery (`plugin-automation/src/commands/trigger/util.ts`, `assistant-toolkit/.../sync-triggers.ts`) queries `FeedAnnotation` schemas then reads `.feed`. With Channel no longer annotated, channels drop out of that set — no crash (they were the only newly-un-annotated type). Verify by building those packages:

Run: `moon run plugin-automation:build && moon run assistant-toolkit:build`
Expected: clean.

- [ ] **Step 3: Build the affected graph + run targeted tests**

Run:

```bash
moon run types:build && moon run plugin-thread:build && moon run plugin-slack:build && moon run plugin-discord:build
moon run types:test && moon run plugin-thread:test
```

Expected: all clean/green.

- [ ] **Step 4: Lint the touched packages**

Run: `moon run types:lint -- --fix && moon run plugin-thread:lint -- --fix && moon run plugin-slack:lint -- --fix && moon run plugin-discord:lint -- --fix`
Expected: clean.

- [ ] **Step 5: Cast audit**

Run: `git diff origin/main | grep -nE '\bas (any|unknown|[A-Z])|as unknown as'`
Expected: no new casts (the `values: any` in the form `handleSave` is a form-callback boundary — if flagged, type it via the built schema's inferred type instead). Justify or remove each hit.

- [ ] **Step 6: Final commit if lint/fmt changed anything**

```bash
git add -A && git commit -m "chore(plugin-thread): lint + format channel backend changes"
```

---

## Self-review notes (addressed)

- **Spec coverage:** §A capability → Task 2; §B schema → Task 1; §C read/write wiring → Tasks 5–7; §D create form → Tasks 3, 8; §E feed provider → Task 4, 9; §F testing → Tasks 1, 3, 4 + plugin-thread suite; cross-plugin call sites (discovered during planning) → Tasks 10–12.
- **Type consistency:** `ChannelBackendProvider` fields (`kind`, `label`, `icon`, `createFields`, `makeConfig`, `subscribe`, `send`, `readOnly`) used identically across Tasks 2–9. `Channel.FeedBackendKind` defined in Task 1, consumed in Tasks 4, 8. `resolveProvider`/`buildChannelFormSchema` defined in Task 3, consumed in Tasks 5–8.
- **Open verification items folded into steps:** `Obj.Any` exact export (Task 1.4), `useCapabilities` hook name (Task 5.1), `Capability.getAll` availability in operation handlers (Task 7.1), `Form`/layout imports from the `CreateGamePanel` precedent (Task 8.3), `.node`/`.workerd` registration placement (Task 9.2).

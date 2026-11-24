# `@dxos/crx-protocol` Package — Implementation Plan (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the CRX↔Composer serializable schemas into a new neutral, effect-Schema-only package `@dxos/crx-protocol`, add a transport-agnostic message layer (`Envelope`/`Channel`/codec/correlation) with a mock Composer peer and conformance suite, and repoint `plugin-crx` at it — with no change to `plugin-crx` runtime behavior.

**Architecture:** A dependency-light package (`effect` only) holds the page-action wire schemas plus a tagged-message protocol driven over an abstract `Channel`. Production transport is unchanged this phase; the new machinery is exercised entirely by in-process tests (`LoopbackChannel` + `MockComposer`). `plugin-crx` keeps its live `PageAction` type and `toDescriptor` (they depend on `@dxos/compute`) but imports every serializable schema from the package.

**Tech Stack:** TypeScript, `effect/Schema`, vitest, moon, pnpm.

## Global Constraints

- New package MUST set `"private": true` in `package.json` (removed only when a trusted publisher is configured).
- `@dxos` packages within the repo are added as `workspace:*`; external packages via the pnpm catalog (`catalog:`).
- The package's only runtime dependency is `effect` (catalog). It MUST NOT depend on `@dxos/app-framework`, `@dxos/compute`, `@dxos/echo`, `react`, or `webextension-polyfill`. Operations are referenced by string id.
- Single quotes; arrow functions; JSDoc on exported functions ending with a period; comments state the invariant, not history.
- Tests use vitest `describe`/`test` with `test('...', ({ expect }) => ...)`, placed as `*.test.ts` beside the module.
- Run tasks with the proto moon shim: `export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH"`. Format markdown/TS with `oxfmt` before committing (`node_modules/.bin/oxfmt --write <files>`).
- Package location: `packages/common/crx-protocol`. Namespace-export style (`export * as PageAction from './PageAction'`), `@import-as-namespace` on namespace files.

---

### Task 1: Scaffold the `@dxos/crx-protocol` package

**Files:**

- Create: `packages/common/crx-protocol/package.json`
- Create: `packages/common/crx-protocol/moon.yml`
- Create: `packages/common/crx-protocol/tsconfig.json`
- Create: `packages/common/crx-protocol/src/index.ts`
- Create: `packages/common/crx-protocol/src/testing.ts`

**Interfaces:**

- Produces: the `@dxos/crx-protocol` package with `.` and `./testing` entrypoints (empty for now).

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "@dxos/crx-protocol",
  "version": "0.9.0",
  "description": "Shared CRX <-> Composer wire protocol (effect schema).",
  "private": true,
  "homepage": "https://dxos.org",
  "bugs": "https://github.com/dxos/dxos/issues",
  "repository": { "type": "git", "url": "https://github.com/dxos/dxos" },
  "license": "FSL-1.1-Apache-2.0",
  "author": "info@dxos.org",
  "type": "module",
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "types": "./dist/types/src/index.d.ts",
      "browser": "./dist/lib/browser/index.mjs",
      "node": "./dist/lib/node-esm/index.mjs"
    },
    "./testing": {
      "source": "./src/testing.ts",
      "types": "./dist/types/src/testing.d.ts",
      "browser": "./dist/lib/browser/testing.mjs",
      "node": "./dist/lib/node-esm/testing.mjs"
    }
  },
  "types": "dist/types/src/index.d.ts",
  "files": ["dist", "src"],
  "dependencies": {
    "effect": "catalog:"
  },
  "devDependencies": {
    "@dxos/typings": "workspace:*"
  },
  "beast": {}
}
```

- [ ] **Step 2: Create `moon.yml`**

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
      - '--entryPoint=src/testing.ts'
      - '--injectGlobals'
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["@dxos/typings"]
  },
  "include": ["src"],
  "references": []
}
```

- [ ] **Step 4: Create placeholder entrypoints**

`src/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export {};
```

`src/testing.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export {};
```

- [ ] **Step 5: Install so the workspace links the package**

Run: `export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH" && HUSKY=0 pnpm install --no-frozen-lockfile`
Expected: completes; `@dxos/crx-protocol` appears under the workspace project list (290+ projects).

- [ ] **Step 6: Commit**

```bash
git add packages/common/crx-protocol pnpm-lock.yaml
git commit -m "feat(crx-protocol): scaffold shared protocol package"
```

---

### Task 2: Port the serializable page-action schemas

Move the wire-serializable schemas from `plugin-crx/src/types/PageAction.ts` into the package. Everything **except** the live `PageAction` type and `toDescriptor` (which depend on `@dxos/compute`) moves. `ListAck`/`InvokeAck` — currently plain TS unions — become effect `Schema`s so they round-trip in the conformance suite.

**Files:**

- Create: `packages/common/crx-protocol/src/PageAction.ts`
- Create: `packages/common/crx-protocol/src/PageAction.test.ts`
- Modify: `packages/common/crx-protocol/src/index.ts`

**Interfaces:**

- Produces (namespace `PageAction`): schemas `Rect`, `Source`, `Selection`, `Hints`, `Snapshot`, `Predicate`, `ExtractorRef`, `Context`, `Descriptor`, `PageInfo`, `Envelope`, `ListRequest`, `ListAck`, `InvokeRequest`, `InvokeAck`; event-name constants `READY_EVENT`, `LIST_EVENT`, `LIST_ACK_EVENT`, `INVOKE_EVENT`, `INVOKE_ACK_EVENT`; types `Descriptor`, `Snapshot`, `ListRequest`, `InvokeRequest`, `ListAck`, `InvokeAck` (`Schema.Schema.Type` of each).

- [ ] **Step 1: Write the failing round-trip test**

`src/PageAction.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as Either from 'effect/Either';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { PageAction } from './index';

describe('PageAction schema', () => {
  test('decodes a valid list request', ({ expect }) => {
    const decoded = Schema.decodeUnknownEither(PageAction.ListRequest)({ version: 1, id: 'req-1' });
    expect(Either.isRight(decoded)).toBe(true);
  });

  test('rejects a list request with a wrong version', ({ expect }) => {
    const decoded = Schema.decodeUnknownEither(PageAction.ListRequest)({ version: 2, id: 'req-1' });
    expect(Either.isLeft(decoded)).toBe(true);
  });

  test('round-trips an invoke ack', ({ expect }) => {
    const ack: PageAction.InvokeAck = { version: 1, id: 'req-1', ok: true, objectId: 'obj-1' };
    const encoded = Schema.encodeSync(PageAction.InvokeAck)(ack);
    const decoded = Schema.decodeUnknownSync(PageAction.InvokeAck)(encoded);
    expect(decoded).toEqual(ack);
  });

  test('round-trips a descriptor', ({ expect }) => {
    const descriptor: PageAction.Descriptor = {
      id: 'a1',
      label: 'Add note',
      icon: 'ph--note--regular',
      urlPatterns: ['https://*/*'],
      extractor: { name: 'snapshot' },
      contexts: ['popup'],
      operation: 'demo/add-note',
    };
    const decoded = Schema.decodeUnknownSync(PageAction.Descriptor)(descriptor);
    expect(decoded).toEqual(descriptor);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH" && moon run crx-protocol:test`
Expected: FAIL — `PageAction` is not exported from `./index`.

- [ ] **Step 3: Create `src/PageAction.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

//
// Serializable page-action types. Operations are referenced by string id;
// the live operation type lives in plugin-crx (this package stays effect-only).
//

export const Rect = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  width: Schema.Number,
  height: Schema.Number,
});

export const Source = Schema.Struct({
  url: Schema.String,
  title: Schema.String,
  favicon: Schema.optional(Schema.String),
  clippedAt: Schema.String,
});
export type Source = Schema.Schema.Type<typeof Source>;

export const Selection = Schema.Struct({
  text: Schema.String,
  html: Schema.optional(Schema.String),
  htmlTruncated: Schema.optional(Schema.Boolean),
  rect: Schema.optional(Rect),
});
export type Selection = Schema.Schema.Type<typeof Selection>;

export const Hints = Schema.Struct({
  ogTitle: Schema.optional(Schema.String),
  ogDescription: Schema.optional(Schema.String),
  ogImage: Schema.optional(Schema.String),
  jsonLd: Schema.optional(Schema.Array(Schema.Unknown)),
  h1: Schema.optional(Schema.String),
  firstImage: Schema.optional(Schema.String),
});
export type Hints = Schema.Schema.Type<typeof Hints>;

/** Generic page capture produced by the extension's `snapshot` extractor. */
export const Snapshot = Schema.Struct({
  source: Source,
  selection: Schema.optional(Selection),
  hints: Schema.optional(Hints),
  imageData: Schema.optional(Schema.String),
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

export const Context = Schema.Literal('popup', 'page', 'selection', 'link', 'picker');
export type Context = Schema.Schema.Type<typeof Context>;

/** Serializable descriptor synced to the extension's registry cache. */
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

export const PageInfo = Schema.Struct({
  url: Schema.String,
  title: Schema.String,
  favicon: Schema.optional(Schema.String),
});
export type PageInfo = Schema.Schema.Type<typeof PageInfo>;

//
// Wire protocol (extension <-> Composer page, via window CustomEvents today).
//

export const READY_EVENT = 'composer:page-actions:ready';
export const LIST_EVENT = 'composer:page-actions:list';
export const LIST_ACK_EVENT = 'composer:page-actions:list:ack';
export const INVOKE_EVENT = 'composer:page-action:invoke';
export const INVOKE_ACK_EVENT = 'composer:page-action:invoke:ack';

/** Loose first-pass decode: newer versions get `unsupportedVersion`; malformed payloads can still echo `id`. */
export const Envelope = Schema.Struct({ version: Schema.Number, id: Schema.optional(Schema.String) });
export type Envelope = Schema.Schema.Type<typeof Envelope>;

export const ListRequest = Schema.Struct({
  version: Schema.Literal(1),
  id: Schema.String,
});
export type ListRequest = Schema.Schema.Type<typeof ListRequest>;

export const ListAck = Schema.Union(
  Schema.Struct({
    version: Schema.Literal(1),
    id: Schema.String,
    ok: Schema.Literal(true),
    actions: Schema.Array(Descriptor),
  }),
  Schema.Struct({ version: Schema.Literal(1), id: Schema.String, ok: Schema.Literal(false), error: Schema.String }),
);
export type ListAck = Schema.Schema.Type<typeof ListAck>;

export const InvokeRequest = Schema.Struct({
  version: Schema.Literal(1),
  id: Schema.String,
  actionId: Schema.String,
  page: PageInfo,
  inputs: Schema.Unknown,
  invokedFrom: Schema.Literal('popup', 'contextMenu', 'picker'),
});
export type InvokeRequest = Schema.Schema.Type<typeof InvokeRequest>;

export const InvokeAck = Schema.Union(
  Schema.Struct({
    version: Schema.Literal(1),
    id: Schema.String,
    ok: Schema.Literal(true),
    objectId: Schema.optional(Schema.String),
  }),
  Schema.Struct({ version: Schema.Literal(1), id: Schema.String, ok: Schema.Literal(false), error: Schema.String }),
);
export type InvokeAck = Schema.Schema.Type<typeof InvokeAck>;
```

- [ ] **Step 4: Export the namespace from `src/index.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

export * as PageAction from './PageAction';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH" && moon run crx-protocol:test`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
node_modules/.bin/oxfmt --write packages/common/crx-protocol/src/PageAction.ts packages/common/crx-protocol/src/PageAction.test.ts packages/common/crx-protocol/src/index.ts
git add packages/common/crx-protocol/src
git commit -m "feat(crx-protocol): page-action wire schemas + round-trip tests"
```

---

### Task 3: `Channel` interface + `LoopbackChannel`

**Files:**

- Create: `packages/common/crx-protocol/src/channel.ts`
- Create: `packages/common/crx-protocol/src/channel.test.ts`
- Modify: `packages/common/crx-protocol/src/index.ts`

**Interfaces:**

- Produces: `interface Channel { send(message: unknown): void; subscribe(handler: (message: unknown) => void): () => void }`; `createLoopback(): [Channel, Channel]` (a wired pair — a message `send` on one surfaces to the other's subscribers).

- [ ] **Step 1: Write the failing test**

`src/channel.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createLoopback } from './index';

describe('createLoopback', () => {
  test('delivers a message from one end to the other', ({ expect }) => {
    const [a, b] = createLoopback();
    const received: unknown[] = [];
    b.subscribe((message) => received.push(message));
    a.send({ hello: 'world' });
    expect(received).toEqual([{ hello: 'world' }]);
  });

  test('unsubscribe stops delivery', ({ expect }) => {
    const [a, b] = createLoopback();
    const received: unknown[] = [];
    const off = b.subscribe((message) => received.push(message));
    off();
    a.send({ x: 1 });
    expect(received).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH" && moon run crx-protocol:test -- src/channel.test.ts`
Expected: FAIL — `createLoopback` not exported.

- [ ] **Step 3: Implement `src/channel.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

/**
 * Transport-agnostic message channel. Production adapters wrap window
 * CustomEvents / chrome.runtime; tests use `createLoopback`.
 */
export interface Channel {
  send(message: unknown): void;
  subscribe(handler: (message: unknown) => void): () => void;
}

/** In-memory channel: messages sent here are delivered to its peer's subscribers. */
class LoopbackChannel implements Channel {
  private _peer!: LoopbackChannel;
  private readonly _handlers = new Set<(message: unknown) => void>();

  _link(peer: LoopbackChannel): void {
    this._peer = peer;
  }

  send(message: unknown): void {
    // Deliver asynchronously to model real transports (no synchronous re-entrancy).
    const handlers = [...this._peer._handlers];
    queueMicrotask(() => handlers.forEach((handler) => handler(message)));
  }

  subscribe(handler: (message: unknown) => void): () => void {
    this._handlers.add(handler);
    return () => this._handlers.delete(handler);
  }
}

/** Create a wired pair of in-memory channels. */
export const createLoopback = (): [Channel, Channel] => {
  const a = new LoopbackChannel();
  const b = new LoopbackChannel();
  a._link(b);
  b._link(a);
  return [a, b];
};
```

- [ ] **Step 4: Re-export from `src/index.ts`**

Append to `src/index.ts`:

```ts
export * from './channel';
```

- [ ] **Step 5: Update the test to await the microtask**

Because `send` now delivers on a microtask, adjust both tests to `await` a tick before asserting:

```ts
a.send({ hello: 'world' });
await Promise.resolve();
expect(received).toEqual([{ hello: 'world' }]);
```

(apply the same `await Promise.resolve();` before the assertion in the unsubscribe test, and mark both test callbacks `async`).

- [ ] **Step 6: Run test to verify it passes**

Run: `export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH" && moon run crx-protocol:test -- src/channel.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
node_modules/.bin/oxfmt --write packages/common/crx-protocol/src/channel.ts packages/common/crx-protocol/src/channel.test.ts packages/common/crx-protocol/src/index.ts
git add packages/common/crx-protocol/src
git commit -m "feat(crx-protocol): Channel interface + loopback"
```

---

### Task 4: Tagged message union + codec + request/response correlation

Wrap the page-action payloads in a tagged, versioned message union and add id-correlated `request`/`serve` helpers over a `Channel`. This is the extensible dispatch used by later phases; production transport is still not wired.

**Files:**

- Create: `packages/common/crx-protocol/src/message.ts`
- Create: `packages/common/crx-protocol/src/rpc.ts`
- Create: `packages/common/crx-protocol/src/rpc.test.ts`
- Modify: `packages/common/crx-protocol/src/index.ts`

**Interfaces:**

- Consumes: `PageAction.*` schemas (Task 2), `Channel` (Task 3).
- Produces:
  - `Message` (a `Schema.Union` of `Schema.TaggedStruct` variants, each carrying `version: 1`, `id: string`, and its payload): tags `page-actions.list`, `page-actions.list-ack`, `page-actions.invoke`, `page-actions.invoke-ack`, `page-actions.ready`.
  - `decodeMessage(value: unknown): Either<Message, ParseError>` and `encodeMessage(message: Message): unknown`.
  - `request(channel: Channel, message: Message, opts?: { timeoutMs?: number }): Promise<Message>` — sends, resolves the reply whose `id` matches; rejects on timeout (default 10_000ms).
  - `serve(channel: Channel, handler: (message: Message) => Promise<Message | undefined> | Message | undefined): () => void` — decodes inbound messages, dispatches to `handler`, sends any returned reply.

- [ ] **Step 1: Write the failing correlation test**

`src/rpc.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Message, createLoopback, request, serve } from './index';

describe('request/serve', () => {
  test('correlates a reply to its request by id', async ({ expect }) => {
    const [client, server] = createLoopback();
    serve(server, (message) => {
      if (message._tag === 'page-actions.list') {
        return Message.make('page-actions.list-ack', { id: message.id, ok: true, actions: [] });
      }
    });

    const reply = await request(client, Message.make('page-actions.list', { id: 'req-1' }));
    expect(reply._tag).toBe('page-actions.list-ack');
    expect(reply.id).toBe('req-1');
  });

  test('rejects on timeout when no reply arrives', async ({ expect }) => {
    const [client] = createLoopback();
    await expect(
      request(client, Message.make('page-actions.list', { id: 'req-x' }), { timeoutMs: 20 }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH" && moon run crx-protocol:test -- src/rpc.test.ts`
Expected: FAIL — `Message`/`request`/`serve` not exported.

- [ ] **Step 3: Implement `src/message.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Descriptor, PageInfo } from './PageAction';

const base = { version: Schema.Literal(1), id: Schema.String };

export const List = Schema.TaggedStruct('page-actions.list', { ...base });
export const ListAck = Schema.Union(
  Schema.TaggedStruct('page-actions.list-ack', {
    ...base,
    ok: Schema.Literal(true),
    actions: Schema.Array(Descriptor),
  }),
  Schema.TaggedStruct('page-actions.list-ack', { ...base, ok: Schema.Literal(false), error: Schema.String }),
);
export const Invoke = Schema.TaggedStruct('page-actions.invoke', {
  ...base,
  actionId: Schema.String,
  page: PageInfo,
  inputs: Schema.Unknown,
  invokedFrom: Schema.Literal('popup', 'contextMenu', 'picker'),
});
export const InvokeAck = Schema.Union(
  Schema.TaggedStruct('page-actions.invoke-ack', {
    ...base,
    ok: Schema.Literal(true),
    objectId: Schema.optional(Schema.String),
  }),
  Schema.TaggedStruct('page-actions.invoke-ack', { ...base, ok: Schema.Literal(false), error: Schema.String }),
);
export const Ready = Schema.TaggedStruct('page-actions.ready', { ...base });

/** The full set of protocol messages. Extend by adding a variant here. */
export const Message = Schema.Union(List, ListAck, Invoke, InvokeAck, Ready);
export type Message = Schema.Schema.Type<typeof Message>;

/** Construct a message, defaulting `version` to 1. */
export const make = <T extends Message['_tag']>(
  tag: T,
  fields: Omit<Extract<Message, { _tag: T }>, '_tag' | 'version'> & { version?: 1 },
): Extract<Message, { _tag: T }> => ({ _tag: tag, version: 1, ...fields }) as Extract<Message, { _tag: T }>;
```

- [ ] **Step 4: Implement `src/rpc.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import * as Either from 'effect/Either';
import * as Schema from 'effect/Schema';

import { type Channel } from './channel';
import { Message } from './message';

const decode = Schema.decodeUnknownEither(Message);

/** Decode an inbound value to a `Message`, or `undefined` if it is not one. */
export const decodeMessage = (value: unknown): Message | undefined => {
  const result = decode(value);
  return Either.isRight(result) ? result.right : undefined;
};

/** Send a request and resolve the reply correlated by `id`; reject on timeout. */
export const request = (channel: Channel, message: Message, opts?: { timeoutMs?: number }): Promise<Message> =>
  new Promise<Message>((resolve, reject) => {
    const timeout = setTimeout(() => {
      off();
      reject(new Error(`crx-protocol request timed out: ${message._tag} ${message.id}`));
    }, opts?.timeoutMs ?? 10_000);
    const off = channel.subscribe((value) => {
      const reply = decodeMessage(value);
      if (reply && reply.id === message.id && reply._tag !== message._tag) {
        clearTimeout(timeout);
        off();
        resolve(reply);
      }
    });
    channel.send(message);
  });

/** Serve inbound requests: decode, dispatch to `handler`, send any reply it returns. */
export const serve = (
  channel: Channel,
  handler: (message: Message) => Promise<Message | undefined> | Message | undefined,
): (() => void) =>
  channel.subscribe((value) => {
    const message = decodeMessage(value);
    if (!message) {
      return;
    }
    void Promise.resolve(handler(message)).then((reply) => {
      if (reply) {
        channel.send(reply);
      }
    });
  });
```

- [ ] **Step 5: Re-export from `src/index.ts`**

Append:

```ts
export * as Message from './message';
export * from './rpc';
```

(Note: `Message.make` and the `Message` type are both reached via the `Message` namespace; the runtime union schema is `Message.Message`. In `rpc.ts` the value import `import { Message } from './message'` refers to the union schema constant — keep that intra-package import direct, not via the namespace.)

- [ ] **Step 6: Run test to verify it passes**

Run: `export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH" && moon run crx-protocol:test -- src/rpc.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Typecheck the package**

Run: `export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH" && MOON_CACHE=off moon run crx-protocol:build`
Expected: no `error TS`.

- [ ] **Step 8: Commit**

```bash
node_modules/.bin/oxfmt --write packages/common/crx-protocol/src/message.ts packages/common/crx-protocol/src/rpc.ts packages/common/crx-protocol/src/rpc.test.ts packages/common/crx-protocol/src/index.ts
git add packages/common/crx-protocol/src
git commit -m "feat(crx-protocol): tagged message union + request/serve correlation"
```

---

### Task 5: `MockComposer` + bidirectional conformance test

**Files:**

- Create: `packages/common/crx-protocol/src/testing/MockComposer.ts`
- Create: `packages/common/crx-protocol/src/testing/index.ts`
- Modify: `packages/common/crx-protocol/src/testing.ts`
- Create: `packages/common/crx-protocol/src/testing/conformance.test.ts`

**Interfaces:**

- Consumes: `createLoopback`, `request`, `serve`, `Message` (Tasks 3–4).
- Produces: `MockComposer` — `{ channel: Channel; handle(handler: (message: Message) => Message | undefined): void }` bound to one end of a loopback, with the extension end returned; `createMockPeer(): { extension: Channel; composer: MockComposer }`.

- [ ] **Step 1: Write the failing bidirectional test**

`src/testing/conformance.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Message, request } from '../index';
import { createMockPeer } from './index';

describe('MockComposer', () => {
  test('extension -> Composer list request is answered', async ({ expect }) => {
    const { extension, composer } = createMockPeer();
    composer.handle((message) =>
      message._tag === 'page-actions.list'
        ? Message.make('page-actions.list-ack', { id: message.id, ok: true, actions: [] })
        : undefined,
    );

    const reply = await request(extension, Message.make('page-actions.list', { id: 'r1' }));
    expect(reply).toMatchObject({ _tag: 'page-actions.list-ack', id: 'r1', ok: true });
  });

  test('Composer -> extension ready is observed', async ({ expect }) => {
    const { extension, composer } = createMockPeer();
    const seen: string[] = [];
    extension.subscribe((value) => {
      const message = Message ? undefined : undefined; // replaced below
    });
    // The extension serves inbound; assert it observes the ready announce.
    const received: string[] = [];
    const { serve } = await import('../index');
    serve(extension, (message) => {
      received.push(message._tag);
      return undefined;
    });
    composer.channel.send(Message.make('page-actions.ready', { id: 'ready-1' }));
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(received).toContain('page-actions.ready');
  });
});
```

> Note for the implementer: the first `extension.subscribe` block in test 2 is dead scaffolding — delete it; the real assertion uses `serve`. (Kept here only to show the intended shape; remove before running.)

- [ ] **Step 2: Run test to verify it fails**

Run: `export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH" && moon run crx-protocol:test -- src/testing/conformance.test.ts`
Expected: FAIL — `createMockPeer` not found.

- [ ] **Step 3: Implement `src/testing/MockComposer.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import { type Channel, createLoopback } from '../channel';
import { type Message } from '../message';
import { serve } from '../rpc';

/** The Composer end of a mock peer: binds a request handler over its channel. */
export class MockComposer {
  private _dispose?: () => void;

  constructor(public readonly channel: Channel) {}

  /** Answer inbound requests with the handler's reply (or nothing). */
  handle(handler: (message: Message) => Message | undefined): void {
    this._dispose?.();
    this._dispose = serve(this.channel, handler);
  }
}

/** Create an extension channel wired to a `MockComposer`. */
export const createMockPeer = (): { extension: Channel; composer: MockComposer } => {
  const [extension, composerChannel] = createLoopback();
  return { extension, composer: new MockComposer(composerChannel) };
};
```

- [ ] **Step 4: Create `src/testing/index.ts` and update `src/testing.ts`**

`src/testing/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export * from './MockComposer';
```

`src/testing.ts` (replace placeholder):

```ts
//
// Copyright 2026 DXOS.org
//

export * from './testing/index';
```

- [ ] **Step 5: Remove the dead scaffolding from the test**

In `src/testing/conformance.test.ts`, delete the `extension.subscribe(...)` block flagged in Step 1's note so only the `serve`-based assertion remains.

- [ ] **Step 6: Run test to verify it passes**

Run: `export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH" && moon run crx-protocol:test -- src/testing/conformance.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
node_modules/.bin/oxfmt --write packages/common/crx-protocol/src/testing packages/common/crx-protocol/src/testing.ts
git add packages/common/crx-protocol/src
git commit -m "feat(crx-protocol): MockComposer peer + bidirectional test"
```

---

### Task 6: Repoint `plugin-crx` at the package (no behavior change)

`plugin-crx` keeps its live `PageAction` type and `toDescriptor`, but imports every serializable schema from `@dxos/crx-protocol`. Its existing CustomEvent handlers keep working unchanged.

**Files:**

- Modify: `packages/plugins/plugin-crx/package.json` (add dependency)
- Modify: `packages/plugins/plugin-crx/tsconfig.json` (add reference)
- Modify: `packages/plugins/plugin-crx/src/types/PageAction.ts` (re-export from the package; keep `PageAction`/`toDescriptor`)
- Modify: `packages/plugins/plugin-crx/src/page-actions.test.ts` (add a MockComposer-backed test)

**Interfaces:**

- Consumes: everything produced by Tasks 2–5.
- Produces: `plugin-crx`'s `#types` `PageAction` namespace unchanged in shape (re-exports the shared schemas + local `PageAction`/`toDescriptor`), so no other `plugin-crx` file changes.

- [ ] **Step 1: Add the dependency and tsconfig reference**

In `packages/plugins/plugin-crx/package.json` `dependencies`, add:

```json
    "@dxos/crx-protocol": "workspace:*",
```

In `packages/plugins/plugin-crx/tsconfig.json` `references`, add (keep alphabetical among the `../../common/*` entries):

```json
    { "path": "../../common/crx-protocol" },
```

- [ ] **Step 2: Rewrite `src/types/PageAction.ts` to re-export the shared schemas**

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type Operation } from '@dxos/compute';
import { PageAction as Protocol } from '@dxos/crx-protocol';

// Re-export the serializable wire schemas from the shared protocol package.
export const {
  Rect,
  Source,
  Selection,
  Hints,
  Snapshot,
  Predicate,
  ExtractorRef,
  Context,
  Descriptor,
  PageInfo,
  Envelope,
  ListRequest,
  ListAck,
  InvokeRequest,
  InvokeAck,
  READY_EVENT,
  LIST_EVENT,
  LIST_ACK_EVENT,
  INVOKE_EVENT,
  INVOKE_ACK_EVENT,
} = Protocol;

export type Source = Protocol.Source;
export type Selection = Protocol.Selection;
export type Hints = Protocol.Hints;
export type Snapshot = Protocol.Snapshot;
export type Predicate = Protocol.Predicate;
export type ExtractorRef = Protocol.ExtractorRef;
export type Context = Protocol.Context;
export type Descriptor = Protocol.Descriptor;
export type PageInfo = Protocol.PageInfo;
export type Envelope = Protocol.Envelope;
export type ListRequest = Protocol.ListRequest;
export type ListAck = Protocol.ListAck;
export type InvokeRequest = Protocol.InvokeRequest;
export type InvokeAck = Protocol.InvokeAck;

/** A live page-action contribution: the target operation accepts `{ snapshot, target }` and returns `{ id }`. */
export type PageAction = Omit<Descriptor, 'operation'> & {
  operation: Operation.Definition.Any;
};

export const toDescriptor = (action: PageAction): Descriptor => ({
  ...action,
  operation: action.operation.meta.key.toString(),
});
```

> Note: `ListAck`/`InvokeAck` are now schema-derived union types (structurally identical to the previous hand-written unions — `{version:1;id;ok:true;…} | {…ok:false;error}`), so `page-actions.ts` (which returns those object literals) still type-checks unchanged.

- [ ] **Step 3: Typecheck plugin-crx to verify the re-export compiles**

Run: `export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH" && HUSKY=0 pnpm install --no-frozen-lockfile && MOON_CACHE=off moon run plugin-crx:build`
Expected: no `error TS`. (If a `#types` consumer used a symbol not re-exported above, add it to the re-export list.)

- [ ] **Step 4: Add a MockComposer-backed test binding the real handlers**

Append to `packages/plugins/plugin-crx/src/page-actions.test.ts`:

```ts
import { Message, request } from '@dxos/crx-protocol';
import { createMockPeer } from '@dxos/crx-protocol/testing';

import { handleListEvent } from './page-actions';

describe('page-actions over the mock protocol peer', () => {
  test('a list request is answered by the real handler', async ({ expect }) => {
    const { extension, composer } = createMockPeer();
    composer.handle((message) => {
      if (message._tag === 'page-actions.list') {
        const ack = handleListEvent({ version: 1, id: message.id }, () => []);
        return Message.make('page-actions.list-ack', {
          id: ack.id,
          ok: ack.ok,
          actions: ack.ok ? ack.actions : undefined,
          error: ack.ok ? undefined : ack.error,
        } as any);
      }
    });
    const reply = await request(extension, Message.make('page-actions.list', { id: 'r1' }));
    expect(reply).toMatchObject({ _tag: 'page-actions.list-ack', id: 'r1', ok: true });
  });
});
```

> Note: the `as any` bridges the legacy `handleListEvent` ack shape onto `Message.make`; Phase 2 removes it once handlers return protocol `Message`s directly. Confirm `describe`/`test` are already imported at the top of the file; if not, add `import { describe, test } from 'vitest';`.

- [ ] **Step 5: Run plugin-crx tests**

Run: `export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH" && MOON_CACHE=off moon run plugin-crx:test`
Expected: PASS, including the new test.

- [ ] **Step 6: Full verification (package + plugin), format, commit**

Run: `export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH" && MOON_CACHE=off moon run crx-protocol:build crx-protocol:test crx-protocol:lint plugin-crx:build plugin-crx:test plugin-crx:lint`
Expected: all pass; lint `Found 0 warnings and 0 errors` for each.

```bash
node_modules/.bin/oxfmt --write packages/plugins/plugin-crx/src/types/PageAction.ts packages/plugins/plugin-crx/src/page-actions.test.ts
git add packages/plugins/plugin-crx pnpm-lock.yaml
git commit -m "refactor(plugin-crx): source page-action schemas from @dxos/crx-protocol"
```

---

## Notes for later phases (not implemented here)

- **Phase 2** repoints `composer-crx` at `@dxos/crx-protocol` (delete the hand-rolled `decode*` mirror in `core/actions/types.ts`), and wires the content-script relay to a real `Channel` adapter (`CustomEvent`⇄`chrome.runtime`).
- **Phase 5** folds `proxy` (`render`/`ping`) and `deliver` into the tagged `Message` union and migrates handlers to return protocol `Message`s (removing the `as any` bridge from Task 6 Step 4).

## Self-Review

- **Spec coverage:** implements spec §5 (shared effect-schema protocol package, envelope/codec/`Channel`, extensibility) and §8 (LoopbackChannel, MockComposer binding real `plugin-crx` handlers, conformance round-trips). §3/§4/§6/§7 are later phases (noted). ✔
- **Placeholders:** none — every step has concrete code/commands. The one intentional `as any` and the dead-scaffolding removal are called out explicitly with rationale. ✔
- **Type consistency:** `Channel` (`send`/`subscribe`) used identically in Tasks 3–5; `Message.make`/`request`/`serve` signatures consistent across Tasks 4–6; `createMockPeer` shape (`{ extension, composer }`) consistent in Task 5 and Task 6. ✔

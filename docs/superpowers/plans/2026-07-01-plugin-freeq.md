# plugin-freeq Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@dxos/plugin-freeq`, a Composer plugin that provides a live, read+write [freeq](https://github.com/chad/freeq) (IRCv3-over-WebSocket, Bluesky/ATProto auth) backend to `plugin-thread`.

**Architecture:** The plugin contributes one `ThreadCapabilities.ChannelBackend` provider (no changes to `plugin-thread`). A layered service stack sits behind it: a pure IRCv3 codec, a `CredentialProvider` SASL seam (app-password → PDS JWT for v1), an `IrcConnection` WebSocket state machine, and a ref-counted `ConnectionManager` that shares one socket per `(serverUrl, identity)`. Messages are transient (in-memory + REST history backfill), matching `plugin-bluesky`.

**Tech Stack:** TypeScript, Effect-TS (`effect`, `@effect/platform` HttpClient), `@dxos/echo`/`@dxos/types` (ECHO schema + `Message`), `@dxos/app-framework`/`@dxos/app-toolkit` (plugin/capability wiring), vitest. No `@atproto/*` SDK; XRPC via `HttpClient`. WebSocket via the browser global, injected for tests.

## Global Constraints

- New package MUST have `"private": true` in `package.json`.
- Every `@dxos` dependency is `workspace:*`; external deps use `catalog:` (never a literal version).
- Single quotes; arrow functions; no default exports unless a module contract requires it (plugin/capability entry files use `export default` per the `plugin-bluesky` convention — match it).
- No casts (`as any`, `as T`, `as unknown as T`, non-null `!`) to silence types; `as const` is allowed. Fix types at the source.
- Effect error channels use domain errors via `BaseError.extend` (from `@dxos/errors`) — never untyped `Error` in an Effect error type.
- Tests: vitest `describe`/`test` (not `it`), `test('name', ({ expect }) => ...)`, files as `*.test.ts` beside modules, unified `TestLayer`.
- Comments end with a period and state the invariant, not the history.
- Copyright header on every source file:
  ```ts
  //
  // Copyright 2026 DXOS.org
  //
  ```
- Plugin id: `org.dxos.plugin.freeq`. Backend kind: `org.dxos.channel.backend.freeq`. Icon: `ph--dog--regular`. Credential source tag: `freeq`.
- Format with `pnpm format` (oxfmt) and `moon run plugin-freeq:lint -- --fix` before committing.

**Reference package to mirror throughout:** `packages/plugins/plugin-bluesky`.

**Commands:**
- Build: `moon run plugin-freeq:build`
- Test one file: `moon run plugin-freeq:test -- src/services/IrcProtocol.test.ts`
- Test all: `moon run plugin-freeq:test`
- Lint+fix: `moon run plugin-freeq:lint -- --fix`

---

### Task 1: Scaffold the package

**Files:**
- Create: `packages/plugins/plugin-freeq/package.json`
- Create: `packages/plugins/plugin-freeq/moon.yml`
- Create: `packages/plugins/plugin-freeq/dx.config.ts`
- Create: `packages/plugins/plugin-freeq/tsconfig.json`
- Create: `packages/plugins/plugin-freeq/PLUGIN.mdl`
- Create: `packages/plugins/plugin-freeq/src/meta.ts`
- Create: `packages/plugins/plugin-freeq/src/index.ts`
- Create: `packages/plugins/plugin-freeq/src/plugin.ts`
- Create: `packages/plugins/plugin-freeq/src/FreeqPlugin.ts`
- Create: `packages/plugins/plugin-freeq/src/translations.ts`

**Interfaces:**
- Produces: `meta` (from `src/meta.ts`), `FreeqPlugin` (lazy, from `src/plugin.ts`), `translations`.

- [ ] **Step 1: Create `package.json`** (copy of `plugin-bluesky/package.json`, adapted). Key edits: `name` → `@dxos/plugin-freeq`; `description` → freeq integration; `#plugin` source → `./src/FreeqPlugin.ts` (and `.d.ts`/`.mjs` paths); drop the `#operations` import (no operations in v1) and drop `#capabilities` for now (added in Task 9). Dependencies — keep: `@dxos/app-framework`, `@dxos/app-toolkit`, `@dxos/client`, `@dxos/echo`, `@dxos/echo-client`, `@dxos/errors`, `@dxos/invariant`, `@dxos/log`, `@dxos/plugin-client`, `@dxos/plugin-thread`, `@dxos/types`, `@dxos/util`, `@effect/platform` (`catalog:`), `effect` (`catalog:`). Remove: `@dxos/compute`, `@dxos/plugin-connector`, `@dxos/plugin-magazine`, `@dxos/protocols`, `@dxos/keys`. devDependencies + peerDependencies: keep identical to bluesky. Ensure `"private": true`.

```json
{
  "name": "@dxos/plugin-freeq",
  "version": "0.9.0",
  "private": true,
  "description": "DXOS plugin integrating freeq (IRCv3-over-WebSocket, Bluesky/ATProto auth) as a live channel backend for plugin-thread.",
  "homepage": "https://dxos.org",
  "bugs": "https://github.com/dxos/dxos/issues",
  "repository": { "type": "git", "url": "https://github.com/dxos/dxos" },
  "license": "FSL-1.1-Apache-2.0",
  "author": "DXOS.org",
  "sideEffects": true,
  "type": "module",
  "imports": {
    "#meta": {
      "source": "./src/meta.ts",
      "types": "./dist/types/src/meta.d.ts",
      "default": "./dist/lib/neutral/meta.mjs"
    },
    "#plugin": {
      "source": "./src/FreeqPlugin.ts",
      "types": "./dist/types/src/FreeqPlugin.d.ts",
      "default": "./dist/lib/neutral/FreeqPlugin.mjs"
    },
    "#translations": {
      "source": "./src/translations.ts",
      "types": "./dist/types/src/translations.d.ts",
      "default": "./dist/lib/neutral/translations.mjs"
    }
  },
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "types": "./dist/types/src/index.d.ts",
      "default": "./dist/lib/neutral/index.mjs"
    },
    "./assets/PLUGIN.mdl": "./PLUGIN.mdl",
    "./plugin": {
      "source": "./src/plugin.ts",
      "types": "./dist/types/src/plugin.d.ts",
      "default": "./dist/lib/neutral/plugin.mjs"
    },
    "./translations": {
      "source": "./src/translations.ts",
      "types": "./dist/types/src/translations.d.ts",
      "default": "./dist/lib/neutral/translations.mjs"
    }
  },
  "types": "dist/types/src/index.d.ts",
  "files": ["dist", "dx.config.ts", "src", "PLUGIN.mdl"],
  "dependencies": {
    "@dxos/app-framework": "workspace:*",
    "@dxos/app-toolkit": "workspace:*",
    "@dxos/client": "workspace:*",
    "@dxos/echo": "workspace:*",
    "@dxos/echo-client": "workspace:*",
    "@dxos/errors": "workspace:*",
    "@dxos/invariant": "workspace:*",
    "@dxos/log": "workspace:*",
    "@dxos/plugin-client": "workspace:*",
    "@dxos/plugin-thread": "workspace:*",
    "@dxos/types": "workspace:*",
    "@dxos/util": "workspace:*",
    "@effect/platform": "catalog:",
    "effect": "catalog:"
  },
  "devDependencies": {
    "@dxos/plugin-space": "workspace:*",
    "@dxos/plugin-testing": "workspace:*",
    "@dxos/plugin-theme": "workspace:*",
    "@dxos/react-client": "workspace:*",
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
    "effect": "catalog:",
    "react": "catalog:",
    "react-dom": "catalog:"
  },
  "publishConfig": { "access": "public" }
}
```

- [ ] **Step 2: Create `moon.yml`** (entry points updated for the freeq layout; extended in later tasks as files are added):

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
      - '--entryPoint=src/FreeqPlugin.ts'
      - '--entryPoint=src/meta.ts'
      - '--entryPoint=src/plugin.ts'
      - '--entryPoint=src/translations.ts'
      - '--platform=neutral'
```

- [ ] **Step 3: Create `dx.config.ts`:**

```ts
//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.freeq',
    name: 'Freeq',
    author: 'DXOS',
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-freeq',
    spec: 'PLUGIN.mdl',
    description: trim`
      Integrates freeq — an IRCv3 chat service that authenticates users via AT
      Protocol / Bluesky identities — as a live channel backend for the DXOS
      Composer thread plugin. The plugin connects to a freeq server over
      WebSocket, authenticates over the ATPROTO-CHALLENGE SASL mechanism, joins
      an IRC channel, streams inbound messages in real time, and sends outbound
      messages from the Composer composer.

      Messages are transient: live messages are held in memory for the session
      and channel history is backfilled from freeq's read-only REST API on join.
      A single WebSocket is shared across every Composer channel that targets the
      same server and identity.
    `,
    icon: { key: 'ph--dog--regular', hue: 'amber' },
    tags: ['labs', 'integration'],
  },
});
```

- [ ] **Step 4: Create `tsconfig.json`** — copy `plugin-bluesky/tsconfig.json` verbatim (path references are workspace-relative and identical for a plugin package). Then remove any `references` entries for packages this plugin does not depend on (`@dxos/compute`, `@dxos/plugin-connector`, `@dxos/plugin-magazine`, `@dxos/protocols`, `@dxos/keys`) and confirm references exist for the deps listed in Step 1. If unsure, run `moon run plugin-freeq:build` after Step 8 and add references the compiler reports as missing.

- [ ] **Step 5: Create `PLUGIN.mdl`** — a minimal spec file. Copy `plugin-bluesky/PLUGIN.mdl` and replace the prose with a one-paragraph description of the freeq backend (the file is loaded as raw text; content is not type-checked).

- [ ] **Step 6: Create `src/meta.ts`:**

```ts
//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import config from '../dx.config';

export const meta = Plugin.getMetaFromConfig(config);
```

- [ ] **Step 7: Create `src/translations.ts`:**

```ts
//
// Copyright 2026 DXOS.org
//

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'Freeq',
        'channel.label': 'Freeq',
        'server url.label': 'Server URL',
        'channel name.label': 'Channel',
        'handle.label': 'Handle',
      },
    },
  },
];
```

- [ ] **Step 8: Create `src/plugin.ts`, `src/FreeqPlugin.ts`, `src/index.ts`** (minimal plugin that builds; capabilities wired in Task 9):

```ts
// src/plugin.ts
//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const FreeqPlugin = Plugin.lazy(meta, () => import('#plugin'));
```

```ts
// src/FreeqPlugin.ts
//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { meta } from '#meta';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';
import { translations } from './translations';

export const FreeqPlugin = Plugin.define(meta).pipe(
  AppPlugin.addTranslationsModule({ translations }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default FreeqPlugin;
```

```ts
// src/index.ts
//
// Copyright 2026 DXOS.org
//

export * from './meta';
```

- [ ] **Step 9: Install and build**

Run: `CI=true pnpm install`
Then: `moon run plugin-freeq:build`
Expected: build succeeds (fix any missing `tsconfig.json` references it reports, per Step 4).

- [ ] **Step 10: Commit**

```bash
git add packages/plugins/plugin-freeq pnpm-lock.yaml
git commit -m "feat(plugin-freeq): scaffold package"
```

---

### Task 2: IRCv3 codec (`IrcProtocol`)

**Files:**
- Create: `packages/plugins/plugin-freeq/src/services/IrcProtocol.ts`
- Test: `packages/plugins/plugin-freeq/src/services/IrcProtocol.test.ts`

**Interfaces:**
- Produces:
  ```ts
  interface IrcMessage {
    tags: Record<string, string>;   // tag values; valueless tags map to ''
    prefix?: string;                // servername or nick!user@host, without leading ':'
    command: string;                // e.g. 'PRIVMSG', '001', 'AUTHENTICATE'
    params: string[];               // trailing param is the last element, un-prefixed
  }
  export const parse: (line: string) => IrcMessage;
  export const serialize: (message: Omit<IrcMessage, 'tags'> & { tags?: Record<string, string> }) => string;
  ```
- `parse`/`serialize` handle IRCv3 message tags (with value-escaping `\:` → `;`, `\s` → space, `\\` → `\`, `\r`/`\n`), an optional `:`-prefixed source, the command, middle params, and a `:`-prefixed trailing param. `serialize` does not append `\r\n` (the transport adds framing).

- [ ] **Step 1: Write failing tests** (`src/services/IrcProtocol.test.ts`):

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { IrcProtocol } from './IrcProtocol';

describe('IrcProtocol', () => {
  test('parses a PRIVMSG with prefix and trailing param', ({ expect }) => {
    const msg = IrcProtocol.parse(':alice!a@host PRIVMSG #general :hello world');
    expect(msg.prefix).toBe('alice!a@host');
    expect(msg.command).toBe('PRIVMSG');
    expect(msg.params).toEqual(['#general', 'hello world']);
  });

  test('parses message tags with escaping', ({ expect }) => {
    const msg = IrcProtocol.parse('@msgid=abc;+draft/x=a\\sb :srv PRIVMSG #c :hi');
    expect(msg.tags.msgid).toBe('abc');
    expect(msg.tags['+draft/x']).toBe('a b');
    expect(msg.command).toBe('PRIVMSG');
  });

  test('parses a command with no params (PING)', ({ expect }) => {
    const msg = IrcProtocol.parse('PING :srv1');
    expect(msg.command).toBe('PING');
    expect(msg.params).toEqual(['srv1']);
  });

  test('parses AUTHENTICATE payload', ({ expect }) => {
    const msg = IrcProtocol.parse('AUTHENTICATE eyJ0eXAi');
    expect(msg.command).toBe('AUTHENTICATE');
    expect(msg.params).toEqual(['eyJ0eXAi']);
  });

  test('serialize round-trips a PRIVMSG', ({ expect }) => {
    const line = IrcProtocol.serialize({ command: 'PRIVMSG', params: ['#general', 'hello world'] });
    expect(line).toBe('PRIVMSG #general :hello world');
    expect(IrcProtocol.parse(line).params).toEqual(['#general', 'hello world']);
  });

  test('serialize emits a trailing param only when needed', ({ expect }) => {
    expect(IrcProtocol.serialize({ command: 'JOIN', params: ['#general'] })).toBe('JOIN #general');
    expect(IrcProtocol.serialize({ command: 'CAP', params: ['REQ', 'sasl'] })).toBe('CAP REQ :sasl');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `moon run plugin-freeq:test -- src/services/IrcProtocol.test.ts`
Expected: FAIL (`Cannot find module './IrcProtocol'`).

- [ ] **Step 3: Implement `src/services/IrcProtocol.ts`:**

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

export interface IrcMessage {
  tags: Record<string, string>;
  prefix?: string;
  command: string;
  params: string[];
}

const unescapeTagValue = (value: string): string =>
  value.replace(/\\(.)/g, (_, ch) => {
    switch (ch) {
      case ':':
        return ';';
      case 's':
        return ' ';
      case 'r':
        return '\r';
      case 'n':
        return '\n';
      case '\\':
        return '\\';
      default:
        return ch;
    }
  });

const escapeTagValue = (value: string): string =>
  value.replace(/[;\s\r\n\\]/g, (ch) => {
    switch (ch) {
      case ';':
        return '\\:';
      case ' ':
        return '\\s';
      case '\r':
        return '\\r';
      case '\n':
        return '\\n';
      default:
        return '\\\\';
    }
  });

// A trailing param needs `:` when empty, containing a space, or starting with `:`.
const needsTrailing = (param: string): boolean => param.length === 0 || param.includes(' ') || param.startsWith(':');

export const parse = (line: string): IrcMessage => {
  let rest = line;
  const tags: Record<string, string> = {};
  if (rest.startsWith('@')) {
    const end = rest.indexOf(' ');
    const tagStr = rest.slice(1, end);
    rest = rest.slice(end + 1).trimStart();
    for (const pair of tagStr.split(';')) {
      const eq = pair.indexOf('=');
      if (eq === -1) {
        tags[pair] = '';
      } else {
        tags[pair.slice(0, eq)] = unescapeTagValue(pair.slice(eq + 1));
      }
    }
  }

  let prefix: string | undefined;
  if (rest.startsWith(':')) {
    const end = rest.indexOf(' ');
    prefix = rest.slice(1, end);
    rest = rest.slice(end + 1).trimStart();
  }

  const params: string[] = [];
  while (rest.length > 0) {
    if (rest.startsWith(':')) {
      params.push(rest.slice(1));
      break;
    }
    const sp = rest.indexOf(' ');
    if (sp === -1) {
      params.push(rest);
      break;
    }
    params.push(rest.slice(0, sp));
    rest = rest.slice(sp + 1).trimStart();
  }

  const command = params.shift() ?? '';
  return { tags, prefix, command, params };
};

export const serialize = (message: Omit<IrcMessage, 'tags'> & { tags?: Record<string, string> }): string => {
  const parts: string[] = [];
  const tagEntries = Object.entries(message.tags ?? {});
  if (tagEntries.length > 0) {
    parts.push('@' + tagEntries.map(([key, value]) => (value === '' ? key : `${key}=${escapeTagValue(value)}`)).join(';'));
  }
  if (message.prefix) {
    parts.push(':' + message.prefix);
  }
  parts.push(message.command);
  message.params.forEach((param, index) => {
    const isLast = index === message.params.length - 1;
    parts.push(isLast && needsTrailing(param) ? ':' + param : param);
  });
  return parts.join(' ');
};
```

- [ ] **Step 4: Add `IrcProtocol` to `moon.yml` compile entry points** — add `- '--entryPoint=src/services/IrcProtocol.ts'`. (Repeat this "add entryPoint" step for each new top-level module in later tasks; not called out again.)

- [ ] **Step 5: Run to verify pass**

Run: `moon run plugin-freeq:test -- src/services/IrcProtocol.test.ts`
Expected: PASS (all 6 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/plugin-freeq/src/services/IrcProtocol.ts packages/plugins/plugin-freeq/src/services/IrcProtocol.test.ts packages/plugins/plugin-freeq/moon.yml
git commit -m "feat(plugin-freeq): add IRCv3 codec"
```

---

### Task 3: Constants, errors, and the `FreeqChannel` schema

**Files:**
- Create: `packages/plugins/plugin-freeq/src/constants.ts`
- Create: `packages/plugins/plugin-freeq/src/errors.ts`
- Create: `packages/plugins/plugin-freeq/src/types.ts`
- Test: `packages/plugins/plugin-freeq/src/types.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const FREEQ_BACKEND_KIND = 'org.dxos.channel.backend.freeq';
  export const FREEQ_SOURCE = 'freeq';
  export const class FreeqAuthError extends BaseError.extend(...);
  export const class FreeqConnectionError extends BaseError.extend(...);
  export class FreeqChannel { serverUrl: string; channel: string; handle?: string }
  export const makeFreeqChannel: (config: { serverUrl: string; channel: string; handle?: string }) => FreeqChannel;
  ```

- [ ] **Step 1: Create `src/constants.ts`:**

```ts
//
// Copyright 2026 DXOS.org
//

/** `Channel.backend.kind` for a live freeq-backed channel. */
export const FREEQ_BACKEND_KIND = 'org.dxos.channel.backend.freeq';

/** `AccessToken.source` for a stored freeq session. */
export const FREEQ_SOURCE = 'freeq';

/** SASL mechanism advertised by freeq for AT Protocol auth. */
export const SASL_MECHANISM = 'ATPROTO-CHALLENGE';

/** Reconnect backoff bounds (ms). */
export const RECONNECT_MIN_DELAY = 1_000;
export const RECONNECT_MAX_DELAY = 30_000;

/** Interval (ms) after which a silent connection is pinged. */
export const KEEPALIVE_INTERVAL = 60_000;
```

- [ ] **Step 2: Create `src/errors.ts`:**

```ts
//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Authentication with the freeq server failed (SASL rejected, session expired, bad credentials). */
export class FreeqAuthError extends BaseError.extend('FreeqAuthError', 'Freeq authentication failed.') {}

/** The freeq WebSocket connection failed or closed unexpectedly. */
export class FreeqConnectionError extends BaseError.extend('FreeqConnectionError', 'Freeq connection failed.') {}
```

- [ ] **Step 3: Write failing test** (`src/types.test.ts`):

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';

import { FreeqChannel, makeFreeqChannel } from './types';

describe('FreeqChannel', () => {
  test('makeFreeqChannel builds a config object', ({ expect }) => {
    const channel = makeFreeqChannel({ serverUrl: 'wss://freeq.example', channel: '#general', handle: 'alice.bsky.social' });
    expect(Obj.instanceOf(FreeqChannel, channel)).toBe(true);
    expect(channel.serverUrl).toBe('wss://freeq.example');
    expect(channel.channel).toBe('#general');
    expect(channel.handle).toBe('alice.bsky.social');
  });

  test('handle is optional', ({ expect }) => {
    const channel = makeFreeqChannel({ serverUrl: 'wss://freeq.example', channel: '#general' });
    expect(channel.handle).toBeUndefined();
  });
});
```

- [ ] **Step 4: Run to verify failure**

Run: `moon run plugin-freeq:test -- src/types.test.ts`
Expected: FAIL (`Cannot find module './types'`).

- [ ] **Step 5: Implement `src/types.ts`:**

```ts
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Obj, Type } from '@dxos/echo';

/**
 * Config object for a live freeq-backed channel. Referenced from
 * `Channel.backend.config`; identifies the freeq server, IRC channel, and the
 * ATProto handle used to authenticate.
 */
export class FreeqChannel extends Type.makeObject<FreeqChannel>(DXN.make('org.dxos.type.freeq.channel', '0.1.0'))(
  Schema.Struct({
    /** freeq WebSocket URL (e.g. `wss://freeq.example`). */
    serverUrl: Schema.String,
    /** IRC channel name including the sigil (e.g. `#general`). */
    channel: Schema.String,
    /** ATProto handle or DID used for SASL auth; unset for a guest (read-only) connection. */
    handle: Schema.optional(Schema.String),
  }),
) {}

/** Creates a freeq channel config object. */
export const makeFreeqChannel = (config: { serverUrl: string; channel: string; handle?: string }): FreeqChannel =>
  Obj.make(FreeqChannel, config);
```

- [ ] **Step 6: Export types + errors from `src/index.ts`** — append `export * from './types';` and `export * from './errors';`. Add `--entryPoint=src/types.ts`, `--entryPoint=src/errors.ts`, `--entryPoint=src/constants.ts` to `moon.yml`.

- [ ] **Step 7: Run to verify pass**

Run: `moon run plugin-freeq:test -- src/types.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/plugins/plugin-freeq/src/constants.ts packages/plugins/plugin-freeq/src/errors.ts packages/plugins/plugin-freeq/src/types.ts packages/plugins/plugin-freeq/src/types.test.ts packages/plugins/plugin-freeq/src/index.ts packages/plugins/plugin-freeq/moon.yml
git commit -m "feat(plugin-freeq): add constants, errors, FreeqChannel schema"
```

---

### Task 4: `CredentialProvider` (SASL seam + app-password impl)

**Files:**
- Create: `packages/plugins/plugin-freeq/src/services/CredentialProvider.ts`
- Test: `packages/plugins/plugin-freeq/src/services/CredentialProvider.test.ts`

**Interfaces:**
- Consumes: `FreeqAuthError` (Task 3), `@effect/platform` `HttpClient`.
- Produces:
  ```ts
  export interface SaslChallenge { sessionId: string; nonce: string; ts: number }
  export interface CredentialProvider {
    // Returns the base64 SASL response payload for the given challenge.
    respond: (challenge: SaslChallenge) => Effect.Effect<string, FreeqAuthError, HttpClient.HttpClient>;
  }
  // Phase-1 impl: exchanges handle + app-password for a PDS session JWT and
  // returns the PDS-session SASL response payload.
  export const makeAppPasswordCredentialProvider: (options: {
    handle: string;
    appPassword: string;
    pdsUrl: string;         // resolved PDS base, e.g. https://bsky.social
  }) => CredentialProvider;
  ```
- The SASL response payload shape is a base64-encoded JSON `{ method: 'pds-session', did, jwt }`. **This shape is provisional — confirm against the freeq server in Task 5/Task 11 and adjust `buildResponse` only.**

- [ ] **Step 1: Write failing test** (`CredentialProvider.test.ts`) using a stubbed `HttpClient` layer that returns a canned `createSession` response:

```ts
//
// Copyright 2026 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { makeAppPasswordCredentialProvider } from './CredentialProvider';

// Minimal stub HttpClient that returns a fixed createSession body.
// Note: `HttpClient.make`'s callback signature is version-specific; if the
// failing-test step reports a type error here, match it to the installed
// `@effect/platform` version (check another test that stubs HttpClient).
const stubHttpClient = (body: unknown) =>
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request) =>
      Effect.succeed(
        HttpClientResponse.fromWeb(request, new Response(JSON.stringify(body), { status: 200 })),
      ),
    ),
  );

describe('AppPasswordCredentialProvider', () => {
  test('exchanges app-password for a session and builds a base64 SASL response', async ({ expect }) => {
    const provider = makeAppPasswordCredentialProvider({
      handle: 'alice.bsky.social',
      appPassword: 'abcd-efgh-ijkl-mnop',
      pdsUrl: 'https://bsky.social',
    });

    const payload = await provider
      .respond({ sessionId: 's1', nonce: 'n1', ts: 1 })
      .pipe(Effect.provide(stubHttpClient({ did: 'did:plc:alice', accessJwt: 'JWT123', refreshJwt: 'R1' })), Effect.runPromise);

    const decoded = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))));
    expect(decoded).toMatchObject({ method: 'pds-session', did: 'did:plc:alice', jwt: 'JWT123' });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `moon run plugin-freeq:test -- src/services/CredentialProvider.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/services/CredentialProvider.ts`:**

```ts
//
// Copyright 2026 DXOS.org
//

import * as HttpBody from '@effect/platform/HttpBody';
import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Effect from 'effect/Effect';

import { FreeqAuthError } from '../errors';

export interface SaslChallenge {
  sessionId: string;
  nonce: string;
  ts: number;
}

export interface CredentialProvider {
  respond: (challenge: SaslChallenge) => Effect.Effect<string, FreeqAuthError, HttpClient.HttpClient>;
}

interface SessionResponse {
  did: string;
  accessJwt: string;
  refreshJwt: string;
}

const toBase64 = (value: string): string => btoa(String.fromCharCode(...new TextEncoder().encode(value)));

/**
 * Phase-1 credential provider. Exchanges an ATProto handle + app-password for a
 * PDS session JWT via `com.atproto.server.createSession`, then presents the JWT
 * as the freeq PDS-session SASL response. The session is created lazily on the
 * first challenge and cached for the lifetime of the provider.
 */
export const makeAppPasswordCredentialProvider = (options: {
  handle: string;
  appPassword: string;
  pdsUrl: string;
}): CredentialProvider => {
  let session: SessionResponse | undefined;

  const createSession = Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const request = HttpClientRequest.post(`${options.pdsUrl}/xrpc/com.atproto.server.createSession`).pipe(
      HttpClientRequest.setHeader('content-type', 'application/json'),
      HttpClientRequest.setBody(
        HttpBody.text(JSON.stringify({ identifier: options.handle, password: options.appPassword }), 'application/json'),
      ),
    );
    const response = yield* client.execute(request);
    return yield* response.json;
  }).pipe(
    Effect.map((body) => body as SessionResponse),
    Effect.mapError((cause) => new FreeqAuthError({ cause })),
  );

  // The SASL response shape is provisional; confirm against the freeq server.
  const buildResponse = (current: SessionResponse): string =>
    toBase64(JSON.stringify({ method: 'pds-session', did: current.did, jwt: current.accessJwt }));

  return {
    respond: (_challenge) =>
      Effect.gen(function* () {
        session ??= yield* createSession;
        return buildResponse(session);
      }),
  };
};
```

- [ ] **Step 4: Run to verify pass**

Run: `moon run plugin-freeq:test -- src/services/CredentialProvider.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-freeq/src/services/CredentialProvider.ts packages/plugins/plugin-freeq/src/services/CredentialProvider.test.ts packages/plugins/plugin-freeq/moon.yml
git commit -m "feat(plugin-freeq): add credential provider (app-password SASL)"
```

---

### Task 5: `IrcConnection` (WebSocket + SASL + JOIN/PRIVMSG state machine)

**Files:**
- Create: `packages/plugins/plugin-freeq/src/services/Transport.ts`
- Create: `packages/plugins/plugin-freeq/src/services/IrcConnection.ts`
- Test: `packages/plugins/plugin-freeq/src/services/IrcConnection.test.ts`

**Interfaces:**
- Consumes: `IrcProtocol` (Task 2), `CredentialProvider`/`SaslChallenge` (Task 4), `FreeqConnectionError`/`FreeqAuthError` (Task 3), constants (Task 3), `HttpClient` (provided by the caller when running `credentialProvider.respond`).
- Produces:
  ```ts
  // Line-oriented transport; the WebSocket impl frames on \r\n. Injected for tests.
  export interface Transport {
    send: (line: string) => void;
    close: () => void;
    onLine: (cb: (line: string) => void) => void;
    onOpen: (cb: () => void) => void;
    onClose: (cb: () => void) => void;
  }
  export const makeWebSocketTransport: (url: string, ctor?: typeof WebSocket) => Transport;

  export interface IncomingMessage { id: string; nick: string; text: string; ts: number }

  export interface IrcConnection {
    connect: () => Promise<void>;                 // resolves once SASL-registered (numeric 001)
    join: (channel: string) => Promise<void>;
    part: (channel: string) => void;
    sendMessage: (channel: string, text: string) => void;
    onMessage: (channel: string, cb: (message: IncomingMessage) => void) => () => void;
    close: () => void;
  }
  export const makeIrcConnection: (options: {
    transport: Transport;
    nick: string;
    credentialProvider?: CredentialProvider;   // omit for guest
    runResponse: (effect: Effect.Effect<string, FreeqAuthError, HttpClient.HttpClient>) => Promise<string>;
  }) => IrcConnection;
  ```
- `runResponse` is how the caller supplies the `HttpClient` layer (it runs the provider's `respond` effect to a promise). Keeps `IrcConnection` free of Effect wiring.

- [ ] **Step 1: Write failing test** (`IrcConnection.test.ts`) driving a `MockTransport` through the full handshake:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Transport, makeIrcConnection } from './IrcConnection';
import { IrcProtocol } from './IrcProtocol';

// Scriptable in-memory transport.
const makeMockTransport = () => {
  let lineCb: (line: string) => void = () => {};
  let openCb: () => void = () => {};
  let closeCb: () => void = () => {};
  const sent: string[] = [];
  const transport: Transport = {
    send: (line) => sent.push(line),
    close: () => closeCb(),
    onLine: (cb) => (lineCb = cb),
    onOpen: (cb) => (openCb = cb),
    onClose: (cb) => (closeCb = cb),
  };
  return { transport, sent, emit: (line: string) => lineCb(line), open: () => openCb() };
};

describe('IrcConnection', () => {
  test('completes CAP + SASL handshake and resolves connect() on 001', async ({ expect }) => {
    const mock = makeMockTransport();
    const connection = makeIrcConnection({
      transport: mock.transport,
      nick: 'alice',
      credentialProvider: { respond: () => undefined as never },
      runResponse: async () => 'BASE64RESPONSE',
    });

    const connected = connection.connect();
    mock.open();

    // Server acknowledges CAP and advertises SASL.
    mock.emit(':srv CAP * LS :sasl');
    mock.emit(':srv CAP alice ACK :sasl');
    // Server issues the challenge.
    mock.emit('AUTHENTICATE ' + btoa(JSON.stringify({ sessionId: 's', nonce: 'n', ts: 1 })));
    // SASL + registration success.
    mock.emit(':srv 900 alice :logged in');
    mock.emit(':srv 903 alice :SASL authentication successful');
    mock.emit(':srv 001 alice :Welcome');

    await connected;

    expect(mock.sent).toContain('CAP LS 302');
    expect(mock.sent).toContain('CAP REQ :sasl');
    expect(mock.sent).toContain('AUTHENTICATE ' + 'ATPROTO-CHALLENGE');
    expect(mock.sent).toContain('AUTHENTICATE BASE64RESPONSE');
    expect(mock.sent).toContain('CAP END');
  });

  test('dispatches inbound PRIVMSG to channel subscribers', async ({ expect }) => {
    const mock = makeMockTransport();
    const connection = makeIrcConnection({ transport: mock.transport, nick: 'alice', runResponse: async () => '' });
    const connected = connection.connect();
    mock.open();
    mock.emit(':srv 001 alice :Welcome');
    await connected;

    const received: string[] = [];
    connection.onMessage('#general', (m) => received.push(m.text));
    mock.emit('@msgid=1 :bob!b@h PRIVMSG #general :hello');
    expect(received).toEqual(['hello']);
  });

  test('sendMessage serializes a PRIVMSG', ({ expect }) => {
    const mock = makeMockTransport();
    const connection = makeIrcConnection({ transport: mock.transport, nick: 'alice', runResponse: async () => '' });
    connection.sendMessage('#general', 'hi there');
    expect(mock.sent).toContain(IrcProtocol.serialize({ command: 'PRIVMSG', params: ['#general', 'hi there'] }));
  });

  test('replies to PING with PONG', ({ expect }) => {
    const mock = makeMockTransport();
    const connection = makeIrcConnection({ transport: mock.transport, nick: 'alice', runResponse: async () => '' });
    connection.connect();
    mock.open();
    mock.emit('PING :srv1');
    expect(mock.sent).toContain('PONG :srv1');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `moon run plugin-freeq:test -- src/services/IrcConnection.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/services/Transport.ts`:**

```ts
//
// Copyright 2026 DXOS.org
//

export interface Transport {
  send: (line: string) => void;
  close: () => void;
  onLine: (cb: (line: string) => void) => void;
  onOpen: (cb: () => void) => void;
  onClose: (cb: () => void) => void;
}

/**
 * WebSocket transport that frames IRC lines on `\r\n`. Outbound lines get a
 * trailing `\r\n`; inbound data is buffered and split on `\r\n` so a partial
 * frame is not delivered as a line.
 */
export const makeWebSocketTransport = (url: string, ctor: typeof WebSocket = WebSocket): Transport => {
  const socket = new ctor(url);
  let lineCb: (line: string) => void = () => {};
  let openCb: () => void = () => {};
  let closeCb: () => void = () => {};
  let buffer = '';

  socket.addEventListener('open', () => openCb());
  socket.addEventListener('close', () => closeCb());
  socket.addEventListener('message', (event) => {
    buffer += typeof event.data === 'string' ? event.data : '';
    let index = buffer.indexOf('\r\n');
    while (index !== -1) {
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      if (line.length > 0) {
        lineCb(line);
      }
      index = buffer.indexOf('\r\n');
    }
  });

  return {
    send: (line) => socket.send(line + '\r\n'),
    close: () => socket.close(),
    onLine: (cb) => (lineCb = cb),
    onOpen: (cb) => (openCb = cb),
    onClose: (cb) => (closeCb = cb),
  };
};
```

- [ ] **Step 4: Implement `src/services/IrcConnection.ts`:**

```ts
//
// Copyright 2026 DXOS.org
//

import type * as HttpClient from '@effect/platform/HttpClient';
import type * as Effect from 'effect/Effect';

import { log } from '@dxos/log';

import { SASL_MECHANISM } from '../constants';
import type { FreeqAuthError } from '../errors';
import type { CredentialProvider, SaslChallenge } from './CredentialProvider';
import { IrcProtocol } from './IrcProtocol';
import type { Transport } from './Transport';

export type { Transport } from './Transport';

export interface IncomingMessage {
  id: string;
  nick: string;
  text: string;
  ts: number;
}

export interface IrcConnection {
  connect: () => Promise<void>;
  join: (channel: string) => Promise<void>;
  part: (channel: string) => void;
  sendMessage: (channel: string, text: string) => void;
  onMessage: (channel: string, cb: (message: IncomingMessage) => void) => () => void;
  close: () => void;
}

const nickOf = (prefix?: string): string => (prefix ? prefix.split('!')[0] : 'unknown');

export const makeIrcConnection = (options: {
  transport: Transport;
  nick: string;
  credentialProvider?: CredentialProvider;
  runResponse: (effect: Effect.Effect<string, FreeqAuthError, HttpClient.HttpClient>) => Promise<string>;
}): IrcConnection => {
  const { transport, nick, credentialProvider, runResponse } = options;
  const subscribers = new Map<string, Set<(message: IncomingMessage) => void>>();
  let synthetic = 0;
  let resolveConnect: (() => void) | undefined;
  let rejectConnect: ((error: unknown) => void) | undefined;

  const handleChallenge = (payload: string): void => {
    if (!credentialProvider) {
      transport.send('AUTHENTICATE *'); // Abort SASL; proceed as guest.
      return;
    }
    let challenge: SaslChallenge;
    try {
      challenge = JSON.parse(atob(payload));
    } catch (error) {
      rejectConnect?.(error);
      return;
    }
    void runResponse(credentialProvider.respond(challenge))
      .then((response) => transport.send('AUTHENTICATE ' + response))
      .catch((error) => rejectConnect?.(error));
  };

  const handleLine = (line: string): void => {
    const message = IrcProtocol.parse(line);
    switch (message.command) {
      case 'PING':
        transport.send(IrcProtocol.serialize({ command: 'PONG', params: message.params }));
        break;
      case 'CAP':
        if (message.params[1] === 'LS') {
          transport.send('CAP REQ :sasl');
        } else if (message.params[1] === 'ACK') {
          transport.send('AUTHENTICATE ' + SASL_MECHANISM);
        }
        break;
      case 'AUTHENTICATE':
        handleChallenge(message.params[0]);
        break;
      case '903': // SASL success.
        transport.send('CAP END');
        break;
      case '904': // SASL failure.
      case '905':
        rejectConnect?.(new Error('SASL authentication failed.'));
        break;
      case '001': // Registration complete.
        resolveConnect?.();
        resolveConnect = undefined;
        rejectConnect = undefined;
        break;
      case 'PRIVMSG': {
        const [channel, text] = message.params;
        const subs = subscribers.get(channel);
        if (subs) {
          const incoming: IncomingMessage = {
            id: message.tags.msgid ?? `local:${++synthetic}`,
            nick: nickOf(message.prefix),
            text: text ?? '',
            ts: message.tags.time ? Date.parse(message.tags.time) : Date.now(),
          };
          subs.forEach((cb) => cb(incoming));
        }
        break;
      }
      default:
        log('irc', { command: message.command });
    }
  };

  transport.onLine(handleLine);
  transport.onOpen(() => {
    transport.send('CAP LS 302');
    transport.send(IrcProtocol.serialize({ command: 'NICK', params: [nick] }));
    transport.send(IrcProtocol.serialize({ command: 'USER', params: [nick, '0', '*', nick] }));
  });

  return {
    connect: () =>
      new Promise<void>((resolve, reject) => {
        resolveConnect = resolve;
        rejectConnect = reject;
      }),
    join: (channel) =>
      new Promise<void>((resolve) => {
        transport.send(IrcProtocol.serialize({ command: 'JOIN', params: [channel] }));
        resolve();
      }),
    part: (channel) => transport.send(IrcProtocol.serialize({ command: 'PART', params: [channel] })),
    sendMessage: (channel, text) =>
      transport.send(IrcProtocol.serialize({ command: 'PRIVMSG', params: [channel, text] })),
    onMessage: (channel, cb) => {
      const subs = subscribers.get(channel) ?? new Set();
      subs.add(cb);
      subscribers.set(channel, subs);
      return () => subs.delete(cb);
    },
    close: () => transport.close(),
  };
};
```

- [ ] **Step 5: Run to verify pass**

Run: `moon run plugin-freeq:test -- src/services/IrcConnection.test.ts`
Expected: PASS (all 4 tests). If the SASL/registration numeric codes differ from the real server, adjust the `case` labels — the state-machine structure is unchanged.

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/plugin-freeq/src/services/Transport.ts packages/plugins/plugin-freeq/src/services/IrcConnection.ts packages/plugins/plugin-freeq/src/services/IrcConnection.test.ts packages/plugins/plugin-freeq/moon.yml
git commit -m "feat(plugin-freeq): add IRC connection state machine"
```

---

### Task 6: `ConnectionManager` (shared socket, ref-counted)

**Files:**
- Create: `packages/plugins/plugin-freeq/src/services/ConnectionManager.ts`
- Test: `packages/plugins/plugin-freeq/src/services/ConnectionManager.test.ts`

**Interfaces:**
- Consumes: `IrcConnection`/`makeIrcConnection`/`Transport` (Task 5), `makeWebSocketTransport` (Task 5), `CredentialProvider` (Task 4).
- Produces:
  ```ts
  export interface ConnectionHandle { connection: IrcConnection; release: () => void }
  export class ConnectionManager {
    constructor(options?: { makeConnection?: (params: ConnectionParams) => IrcConnection });
    // Returns an existing connection for (serverUrl, identityKey) or creates one; ref-counted.
    acquire(params: ConnectionParams): ConnectionHandle;
  }
  export interface ConnectionParams {
    serverUrl: string;
    identityKey: string;          // did/handle, or 'guest'
    nick: string;
    credentialProvider?: CredentialProvider;
    runResponse: (effect: ...) => Promise<string>;
  }
  ```
- `acquire` keys on `${serverUrl}::${identityKey}`; the first `acquire` creates + `connect()`s the connection; each `release` decrements, and the last `release` `close()`s and evicts.

- [ ] **Step 1: Write failing test** (`ConnectionManager.test.ts`) injecting a fake `makeConnection`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ConnectionManager } from './ConnectionManager';
import { type IrcConnection } from './IrcConnection';

const makeFakeConnection = (): IrcConnection & { closed: number; connects: number } => {
  const state = { closed: 0, connects: 0 };
  return {
    ...state,
    connect: async () => void state.connects++,
    join: async () => {},
    part: () => {},
    sendMessage: () => {},
    onMessage: () => () => {},
    close: () => void state.closed++,
    get closed() {
      return state.closed;
    },
    get connects() {
      return state.connects;
    },
  } as any;
};

describe('ConnectionManager', () => {
  test('shares one connection across acquires with the same key', ({ expect }) => {
    let created = 0;
    const manager = new ConnectionManager({
      makeConnection: () => {
        created++;
        return makeFakeConnection();
      },
    });
    const params = { serverUrl: 'wss://s', identityKey: 'did:a', nick: 'a', runResponse: async () => '' };
    const a = manager.acquire(params);
    const b = manager.acquire(params);
    expect(created).toBe(1);
    expect(a.connection).toBe(b.connection);
  });

  test('closes the connection only when the last handle is released', ({ expect }) => {
    const fake = makeFakeConnection();
    const manager = new ConnectionManager({ makeConnection: () => fake });
    const params = { serverUrl: 'wss://s', identityKey: 'did:a', nick: 'a', runResponse: async () => '' };
    const a = manager.acquire(params);
    const b = manager.acquire(params);
    a.release();
    expect(fake.closed).toBe(0);
    b.release();
    expect(fake.closed).toBe(1);
  });

  test('creates distinct connections for distinct identities', ({ expect }) => {
    let created = 0;
    const manager = new ConnectionManager({
      makeConnection: () => {
        created++;
        return makeFakeConnection();
      },
    });
    manager.acquire({ serverUrl: 'wss://s', identityKey: 'did:a', nick: 'a', runResponse: async () => '' });
    manager.acquire({ serverUrl: 'wss://s', identityKey: 'did:b', nick: 'b', runResponse: async () => '' });
    expect(created).toBe(2);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `moon run plugin-freeq:test -- src/services/ConnectionManager.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/services/ConnectionManager.ts`:**

```ts
//
// Copyright 2026 DXOS.org
//

import type * as HttpClient from '@effect/platform/HttpClient';
import type * as Effect from 'effect/Effect';

import type { FreeqAuthError } from '../errors';
import type { CredentialProvider } from './CredentialProvider';
import { type IrcConnection, makeIrcConnection } from './IrcConnection';
import { makeWebSocketTransport } from './Transport';

export interface ConnectionParams {
  serverUrl: string;
  identityKey: string;
  nick: string;
  credentialProvider?: CredentialProvider;
  runResponse: (effect: Effect.Effect<string, FreeqAuthError, HttpClient.HttpClient>) => Promise<string>;
}

export interface ConnectionHandle {
  connection: IrcConnection;
  release: () => void;
}

interface Entry {
  connection: IrcConnection;
  refCount: number;
}

const keyOf = (params: ConnectionParams): string => `${params.serverUrl}::${params.identityKey}`;

/**
 * Owns one `IrcConnection` per `(serverUrl, identity)` and reference-counts
 * consumers so that multiple Composer channels on the same server multiplex a
 * single WebSocket. The connection is created and connected on first acquire
 * and closed when the last handle is released.
 */
export class ConnectionManager {
  readonly #entries = new Map<string, Entry>();
  readonly #makeConnection: (params: ConnectionParams) => IrcConnection;

  constructor(options?: { makeConnection?: (params: ConnectionParams) => IrcConnection }) {
    this.#makeConnection =
      options?.makeConnection ??
      ((params) =>
        makeIrcConnection({
          transport: makeWebSocketTransport(params.serverUrl),
          nick: params.nick,
          credentialProvider: params.credentialProvider,
          runResponse: params.runResponse,
        }));
  }

  acquire(params: ConnectionParams): ConnectionHandle {
    const key = keyOf(params);
    let entry = this.#entries.get(key);
    if (!entry) {
      entry = { connection: this.#makeConnection(params), refCount: 0 };
      this.#entries.set(key, entry);
      void entry.connection.connect();
    }
    entry.refCount++;

    let released = false;
    return {
      connection: entry.connection,
      release: () => {
        if (released) {
          return;
        }
        released = true;
        const current = this.#entries.get(key);
        if (!current) {
          return;
        }
        current.refCount--;
        if (current.refCount <= 0) {
          current.connection.close();
          this.#entries.delete(key);
        }
      },
    };
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `moon run plugin-freeq:test -- src/services/ConnectionManager.test.ts`
Expected: PASS (all 3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-freeq/src/services/ConnectionManager.ts packages/plugins/plugin-freeq/src/services/ConnectionManager.test.ts packages/plugins/plugin-freeq/moon.yml
git commit -m "feat(plugin-freeq): add ref-counted connection manager"
```

---

### Task 7: `FreeqRestApi` (history backfill)

**Files:**
- Create: `packages/plugins/plugin-freeq/src/services/FreeqRestApi.ts`
- Create: `packages/plugins/plugin-freeq/src/services/index.ts`
- Test: `packages/plugins/plugin-freeq/src/services/FreeqRestApi.test.ts`

**Interfaces:**
- Consumes: `HttpClient`, `FreeqConnectionError` (Task 3).
- Produces:
  ```ts
  export interface FreeqRestMessage { id: string; nick: string; text: string; ts: number }
  // GET {httpBase}/api/v1/channels/{channel}/messages  (channel without leading '#').
  export const getMessages: (options: { httpBase: string; channel: string }) =>
    Effect.Effect<ReadonlyArray<FreeqRestMessage>, FreeqConnectionError, HttpClient.HttpClient>;
  // Derives the REST base (https) from a ws(s):// server URL.
  export const httpBaseFromWs: (serverUrl: string) => string;
  ```
- The REST response mapping (`id`/`nick`/`text`/`ts` field names) is **provisional** — confirm against the server in Task 11 and adjust the decode in `getMessages` only.

- [ ] **Step 1: Write failing test** using the same `stubHttpClient` helper as Task 4 (copy it into this test file):

```ts
//
// Copyright 2026 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { FreeqRestApi } from './index';

const stubHttpClient = (body: unknown) =>
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request) =>
      Effect.succeed(HttpClientResponse.fromWeb(request, new Response(JSON.stringify(body), { status: 200 }))),
    ),
  );

describe('FreeqRestApi', () => {
  test('httpBaseFromWs converts wss to https', ({ expect }) => {
    expect(FreeqRestApi.httpBaseFromWs('wss://freeq.example')).toBe('https://freeq.example');
    expect(FreeqRestApi.httpBaseFromWs('ws://localhost:6680')).toBe('http://localhost:6680');
  });

  test('getMessages maps the REST payload', async ({ expect }) => {
    const messages = await FreeqRestApi.getMessages({ httpBase: 'https://freeq.example', channel: '#general' }).pipe(
      Effect.provide(
        stubHttpClient({ messages: [{ id: 'm1', nick: 'bob', text: 'hi', ts: 1700000000000 }] }),
      ),
      Effect.runPromise,
    );
    expect(messages).toEqual([{ id: 'm1', nick: 'bob', text: 'hi', ts: 1700000000000 }]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `moon run plugin-freeq:test -- src/services/FreeqRestApi.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/services/FreeqRestApi.ts`:**

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Effect from 'effect/Effect';

import { FreeqConnectionError } from '../errors';

export interface FreeqRestMessage {
  id: string;
  nick: string;
  text: string;
  ts: number;
}

interface RestPayload {
  messages: FreeqRestMessage[];
}

/** Derives the REST/HTTP base from a freeq WebSocket URL (`wss` → `https`, `ws` → `http`). */
export const httpBaseFromWs = (serverUrl: string): string => serverUrl.replace(/^ws(s?):\/\//, 'http$1://');

/** Fetches recent channel history from the read-only freeq REST API. */
export const getMessages = (options: {
  httpBase: string;
  channel: string;
}): Effect.Effect<ReadonlyArray<FreeqRestMessage>, FreeqConnectionError, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const name = options.channel.replace(/^#/, '');
    const request = HttpClientRequest.get(
      `${options.httpBase}/api/v1/channels/${encodeURIComponent(name)}/messages`,
    );
    const response = yield* client.execute(request);
    const payload = yield* response.json;
    return (payload as RestPayload).messages ?? [];
  }).pipe(Effect.mapError((cause) => new FreeqConnectionError({ cause })));
```

- [ ] **Step 4: Create `src/services/index.ts`** (namespace barrel for services consumed by capabilities):

```ts
//
// Copyright 2026 DXOS.org
//

export * as FreeqRestApi from './FreeqRestApi';
export * as IrcProtocol from './IrcProtocol';
export * from './ConnectionManager';
export * from './CredentialProvider';
export * from './IrcConnection';
export * from './Transport';
```

Add `--entryPoint=src/services/index.ts` and `--entryPoint=src/services/FreeqRestApi.ts` to `moon.yml`.

- [ ] **Step 5: Run to verify pass**

Run: `moon run plugin-freeq:test -- src/services/FreeqRestApi.test.ts`
Expected: PASS (both tests).

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/plugin-freeq/src/services/FreeqRestApi.ts packages/plugins/plugin-freeq/src/services/FreeqRestApi.test.ts packages/plugins/plugin-freeq/src/services/index.ts packages/plugins/plugin-freeq/moon.yml
git commit -m "feat(plugin-freeq): add REST history backfill"
```

---

### Task 8: `channel-backend` provider

**Files:**
- Create: `packages/plugins/plugin-freeq/src/FreeqCapabilities.ts`
- Create: `packages/plugins/plugin-freeq/src/capabilities/channel-backend.ts`
- Test: `packages/plugins/plugin-freeq/src/capabilities/channel-backend.test.ts`

**Interfaces:**
- Consumes: `ThreadCapabilities.ChannelBackendProvider` (`@dxos/plugin-thread`), `Message` (`@dxos/types`), `ConnectionManager`/`IncomingMessage` (Tasks 5–6), `FreeqRestApi` (Task 7), `FreeqChannel`/`makeFreeqChannel` (Task 3), `FREEQ_BACKEND_KIND` (Task 3).
- Produces:
  ```ts
  // In FreeqCapabilities.ts:
  export const ConnectionManager = Capability.make<ConnectionManagerClass>(`${meta.profile.key}.capability.connection-manager`);
  // In channel-backend.ts:
  export const makeFreeqChannelBackend: (manager: ConnectionManagerClass) => ThreadCapabilities.ChannelBackendProvider;
  export const toMessage: (incoming: IncomingMessage) => Message.Message;   // exported for tests
  ```
- The provider builds `ConnectionParams` from the loaded `FreeqChannel`. **For this task the connection is unauthenticated (guest, `credentialProvider` omitted, `readOnly` when no handle).** Wiring the stored `AccessToken` credential into `credentialProvider` is finished in Task 9 where the `Client` capability is available.

- [ ] **Step 1: Write failing test** (`channel-backend.test.ts`) — verifies message mapping and that `subscribe` wires REST backfill + live messages through a fake `ConnectionManager`. Use an in-memory `FreeqChannel` via `createObject` so `channel.backend.config.load()` resolves.

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { type IncomingMessage } from '../services';
import { makeFreeqChannelBackend, toMessage } from './channel-backend';

describe('freeq channel backend', () => {
  test('toMessage maps an incoming IRC message to a chat message', ({ expect }) => {
    const incoming: IncomingMessage = { id: 'm1', nick: 'bob', text: 'hello', ts: 1700000000000 };
    const message = toMessage(incoming);
    expect(message.sender.name).toBe('bob');
    expect(message.blocks[0]).toMatchObject({ _tag: 'text', text: 'hello' });
  });

  test('send delegates a PRIVMSG to the acquired connection', async ({ expect }) => {
    const sent: Array<[string, string]> = [];
    const fakeConnection = {
      connect: async () => {},
      join: async () => {},
      part: () => {},
      sendMessage: (channel: string, text: string) => sent.push([channel, text]),
      onMessage: () => () => {},
      close: () => {},
    };
    const manager = { acquire: () => ({ connection: fakeConnection, release: () => {} }) } as any;

    // A FreeqChannel-shaped config resolved by a Channel-shaped stub.
    const channel = {
      backend: { kind: 'org.dxos.channel.backend.freeq', config: { load: async () => ({ serverUrl: 'wss://s', channel: '#c' }) } },
    } as any;

    const backend = makeFreeqChannelBackend(manager);
    await backend.send(channel, toMessage({ id: 'x', nick: 'me', text: 'hi', ts: 1 })).pipe(Effect.runPromise);
    expect(sent).toEqual([['#c', 'hi']]);
  });
});
```

> Note: `subscribe` uses `channel.backend.config.load()` (async) then `manager.acquire`, REST backfill, and `connection.onMessage`. The test above covers `toMessage` and `send`; a fuller `subscribe` test (backfill + live merge + dedup) may be added once the real server field shapes are confirmed (Task 11).

- [ ] **Step 2: Run to verify failure**

Run: `moon run plugin-freeq:test -- src/capabilities/channel-backend.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/FreeqCapabilities.ts`:**

```ts
//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

import { meta } from './meta';
import { type ConnectionManager } from './services';

/** The shared, ref-counted freeq connection manager. */
export const ConnectionManager = Capability.make<ConnectionManager>(
  `${meta.profile.key}.capability.connection-manager`,
);
```

- [ ] **Step 4: Implement `src/capabilities/channel-backend.ts`:**

```ts
//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Obj } from '@dxos/echo';
import { ThreadCapabilities } from '@dxos/plugin-thread';
import { Message } from '@dxos/types';

import { FREEQ_BACKEND_KIND } from '../constants';
import {
  type ConnectionManager,
  type IncomingMessage,
  FreeqRestApi,
} from '../services';
import { FreeqChannel, makeFreeqChannel } from '../types';

/** Maps an inbound freeq/IRC message to a transient (non-persisted) chat message. */
export const toMessage = (incoming: IncomingMessage): Message.Message =>
  Message.make({
    sender: { name: incoming.nick },
    created: new Date(incoming.ts).toISOString(),
    blocks: [{ _tag: 'text', text: incoming.text }],
  });

const toMessageFromRest = (rest: FreeqRestApi.FreeqRestMessage): Message.Message => toMessage(rest);

/**
 * Live, read+write freeq channel backend. Joins an IRC channel over a shared
 * WebSocket, backfills recent history from the REST API, and streams inbound
 * PRIVMSGs. Messages are transient and de-duplicated by freeq message id.
 */
export const makeFreeqChannelBackend = (manager: ConnectionManager): ThreadCapabilities.ChannelBackendProvider => ({
  kind: FREEQ_BACKEND_KIND,
  label: 'Freeq',
  icon: 'ph--dog--regular',
  createFields: Schema.Struct({
    serverUrl: Schema.String.annotations({ title: 'Server URL', description: 'freeq WebSocket URL (wss://…).' }),
    channel: Schema.String.annotations({ title: 'Channel', description: 'IRC channel name (e.g. #general).' }),
    handle: Schema.optional(
      Schema.String.annotations({ title: 'Handle', description: 'Bluesky handle for authentication (optional).' }),
    ),
  }),
  makeConfig: (options) =>
    makeFreeqChannel({
      serverUrl: String(options.serverUrl ?? ''),
      channel: String(options.channel ?? ''),
      handle: options.handle ? String(options.handle) : undefined,
    }),
  subscribe: (channel, onMessages) => {
    let cancelled = false;
    let release: (() => void) | undefined;
    let unsubscribe: (() => void) | undefined;
    // Ordered by insertion; keyed by freeq message id for dedup and stable identity.
    const byId = new Map<string, Message.Message>();
    const emit = () => !cancelled && onMessages([...byId.values()]);

    void channel.backend.config.load().then((config) => {
      if (cancelled || !Obj.instanceOf(FreeqChannel, config) || !config.serverUrl || !config.channel) {
        onMessages([]);
        return;
      }

      // Guest connection for now; Task 9 supplies credentials + nick from the identity.
      const acquired = manager.acquire({
        serverUrl: config.serverUrl,
        identityKey: config.handle ?? 'guest',
        nick: config.handle?.split('.')[0] ?? 'guest',
        runResponse: (effect) => effect.pipe(Effect.provide(FetchHttpClient.layer), Effect.runPromise),
      });
      release = acquired.release;

      void acquired.connection.join(config.channel);
      unsubscribe = acquired.connection.onMessage(config.channel, (incoming) => {
        byId.set(incoming.id, toMessage(incoming));
        emit();
      });

      // Backfill history (best-effort; live messages win on id collision).
      void FreeqRestApi.getMessages({ httpBase: FreeqRestApi.httpBaseFromWs(config.serverUrl), channel: config.channel })
        .pipe(Effect.provide(FetchHttpClient.layer), Effect.runPromise)
        .then((history) => {
          if (cancelled) {
            return;
          }
          for (const rest of history) {
            if (!byId.has(rest.id)) {
              byId.set(rest.id, toMessageFromRest(rest));
            }
          }
          emit();
        })
        .catch(() => emit());
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
      release?.();
    };
  },
  send: (channel, message) =>
    Effect.gen(function* () {
      const config = yield* Effect.promise(() => channel.backend.config.load());
      if (!Obj.instanceOf(FreeqChannel, config)) {
        return;
      }
      const acquired = manager.acquire({
        serverUrl: config.serverUrl,
        identityKey: config.handle ?? 'guest',
        nick: config.handle?.split('.')[0] ?? 'guest',
        runResponse: (effect) => effect.pipe(Effect.provide(FetchHttpClient.layer), Effect.runPromise),
      });
      const text = message.blocks.find((block) => block._tag === 'text')?.text ?? '';
      acquired.connection.sendMessage(config.channel, text);
      acquired.release();
    }),
  readOnly: (channel) => Obj.getMeta(channel).keys.length > 0,
});
```

> Note: `send` acquires+releases around a single PRIVMSG, relying on the manager to keep the socket alive because `subscribe` holds a concurrent reference. This is corrected/simplified in Task 9 to reuse the subscription's handle where available.

- [ ] **Step 5: Run to verify pass**

Run: `moon run plugin-freeq:test -- src/capabilities/channel-backend.test.ts`
Expected: PASS (both tests).

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/plugin-freeq/src/FreeqCapabilities.ts packages/plugins/plugin-freeq/src/capabilities/channel-backend.ts packages/plugins/plugin-freeq/src/capabilities/channel-backend.test.ts
git commit -m "feat(plugin-freeq): add live channel backend provider"
```

---

### Task 9: Wire the plugin (capabilities + credentials)

**Files:**
- Create: `packages/plugins/plugin-freeq/src/capabilities/connection-manager.ts`
- Create: `packages/plugins/plugin-freeq/src/capabilities/index.ts`
- Modify: `packages/plugins/plugin-freeq/src/FreeqPlugin.ts`
- Modify: `packages/plugins/plugin-freeq/src/index.ts`
- Modify: `packages/plugins/plugin-freeq/package.json` (add `#capabilities` import)
- Modify: `packages/plugins/plugin-freeq/moon.yml`

**Interfaces:**
- Consumes: `FreeqCapabilities.ConnectionManager` (Task 8), `makeFreeqChannelBackend` (Task 8), `ThreadCapabilities.ChannelBackend` (`@dxos/plugin-thread`), `ConnectionManager` class (Task 6).
- Produces: `ChannelBackend`, `ConnectionManager` lazy capability modules; a `FreeqPlugin` that contributes schema + both modules.

- [ ] **Step 1: Implement `src/capabilities/connection-manager.ts`** — contributes a `ConnectionManager` instance as a capability:

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';

import * as FreeqCapabilities from '../FreeqCapabilities';
import { ConnectionManager } from '../services';

/** Contributes the shared, ref-counted freeq connection manager. */
export const ConnectionManagerModule = Capability.makeModule<ConnectionManager>(
  Effect.fnUntraced(function* () {
    return Capability.contributes(FreeqCapabilities.ConnectionManager, new ConnectionManager());
  }),
);

export default ConnectionManagerModule;
```

- [ ] **Step 2: Implement `src/capabilities/channel-backend` module wrapper** — append to `src/capabilities/channel-backend.ts` a module that resolves the manager capability and contributes the provider (mirrors bluesky's `Capability.makeModule` at the bottom of its `channel-backend.ts`):

```ts
// Appended to src/capabilities/channel-backend.ts

import { Capability } from '@dxos/app-framework';

import * as FreeqCapabilities from '../FreeqCapabilities';

/** Contributes the live freeq channel backend, bound to the shared connection manager. */
export const ChannelBackend = Capability.makeModule<ThreadCapabilities.ChannelBackendProvider>(
  Effect.fnUntraced(function* () {
    const manager = yield* Capability.get(FreeqCapabilities.ConnectionManager);
    return Capability.contributes(ThreadCapabilities.ChannelBackend, makeFreeqChannelBackend(manager));
  }),
);
```

(Add the `Capability` import to the existing import block; do not duplicate.)

- [ ] **Step 3: Implement `src/capabilities/index.ts`** (lazy capability handles):

```ts
//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { type ThreadCapabilities } from '@dxos/plugin-thread';

import { type ConnectionManager } from '../services';

export const ChannelBackend = Capability.lazy<ThreadCapabilities.ChannelBackendProvider>('FreeqChannelBackend', () =>
  import('./channel-backend').then((module) => module.ChannelBackend),
);
export const ConnectionManager = Capability.lazy<ConnectionManager>('FreeqConnectionManager', () =>
  import('./connection-manager'),
);
```

> If `Capability.lazy` expects the module's `default` export (as in bluesky), export `ChannelBackend` as the default of a small `./channel-backend-module.ts` re-exporter, OR set `export default ChannelBackend` in `channel-backend.ts`. Match whichever form `@dxos/plugin-bluesky/src/capabilities/index.ts` uses against its target modules — bluesky's channel-backend uses `export default ChannelBackend`, so add `export default ChannelBackend;` at the end of `channel-backend.ts` and simplify the lazy handle to `() => import('./channel-backend')`.

- [ ] **Step 4: Update `src/FreeqPlugin.ts`** to add schema + both capability modules:

```ts
//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { ChannelBackend, ConnectionManager } from '#capabilities';
import { meta } from '#meta';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';
import { translations } from './translations';
import { FreeqChannel } from './types';

export const FreeqPlugin = Plugin.define(meta).pipe(
  AppPlugin.addTranslationsModule({ translations }),
  AppPlugin.addSchemaModule({ schema: [FreeqChannel] }),
  Plugin.addModule({
    id: 'connection-manager',
    activatesOn: ActivationEvents.Startup,
    activate: ConnectionManager,
  }),
  Plugin.addModule({
    id: 'channel-backend',
    activatesOn: ActivationEvents.Startup,
    activate: ChannelBackend,
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default FreeqPlugin;
```

- [ ] **Step 5: Add `#capabilities` to `package.json` `imports`** (same shape as bluesky's `#capabilities` entry, pointing at `./src/capabilities/index.ts`). Add `--entryPoint=src/capabilities/index.ts` and `--entryPoint=src/FreeqCapabilities.ts` to `moon.yml`. Append `export * from './FreeqCapabilities';` to `src/index.ts` if the capability tag should be public (optional).

- [ ] **Step 6: Credential wiring (Phase-1, best-effort).** In `makeFreeqChannelBackend`, when a `handle` is present, build an `AppPasswordCredentialProvider` from a stored `AccessToken`. Since `subscribe` has no Effect context, resolve the `Client` capability at module-activation time and pass a `lookupCredential(handle) => { appPassword; pdsUrl } | undefined` function into `makeFreeqChannelBackend`. Implement `lookupCredential` by querying the space for an `AccessToken` with `source === FREEQ_SOURCE` and matching account. **If no credential exists, keep the guest path (current behavior).** Add a focused unit test that, given a `lookupCredential` returning a stub, the acquired `ConnectionParams.credentialProvider` is defined.

  - Modify signature: `makeFreeqChannelBackend(manager, lookupCredential?)`.
  - In the `ChannelBackend` module: `const client = yield* Capability.get(ClientCapabilities.Client);` then pass a `lookupCredential` closure that reads `AccessToken` objects. (Follow plugin-bluesky's `Credentials.fromConnection` for how it loads `AccessToken` and resolves the PDS via `resolveHandle`; reuse that PDS-resolution approach or copy the minimal `resolvePds` helper into `services/FreeqRestApi.ts`.)

- [ ] **Step 7: Build + full test**

Run: `moon run plugin-freeq:build`
Then: `moon run plugin-freeq:test`
Expected: build succeeds; all tests pass.

- [ ] **Step 8: Lint + format**

Run: `moon run plugin-freeq:lint -- --fix`
Then: `pnpm format`
Then audit for casts: `git diff origin/main -- packages/plugins/plugin-freeq | grep -nE '\bas (any|unknown|[A-Z])|as unknown as'` — justify or remove each hit (the test files' `as any` on hand-rolled stubs are acceptable test-boundary coercions; add a short comment).

- [ ] **Step 9: Commit**

```bash
git add packages/plugins/plugin-freeq
git commit -m "feat(plugin-freeq): wire plugin capabilities and credentials"
```

---

### Task 10: Register in the Composer app

**Files:**
- Modify: `packages/apps/composer-app/package.json`
- Modify: `packages/apps/composer-app/src/plugin-defs.tsx`
- Modify: `packages/apps/composer-app/tsconfig.json`

**Interfaces:**
- Consumes: `FreeqPlugin` (from `@dxos/plugin-freeq/plugin`).

- [ ] **Step 1: Add the dependency** — in `packages/apps/composer-app/package.json`, add `"@dxos/plugin-freeq": "workspace:*",` alongside `"@dxos/plugin-bluesky"` (keep alphabetical order among the `@dxos/plugin-*` entries).

- [ ] **Step 2: Import + register** — in `packages/apps/composer-app/src/plugin-defs.tsx`:
  - Add near the other plugin imports (line ~14): `import { FreeqPlugin } from '@dxos/plugin-freeq/plugin';`
  - Add `FreeqPlugin(),` in the standalone-integrations block, right after `BlueskyPlugin(),` (line ~277).

- [ ] **Step 3: tsconfig reference** — in `packages/apps/composer-app/tsconfig.json`, add a `{ "path": "../../plugins/plugin-freeq" }` reference matching the existing `plugin-bluesky` reference entry.

- [ ] **Step 4: Install + build the app**

Run: `CI=true pnpm install`
Then: `moon run composer-app:build`
Expected: build succeeds and includes `@dxos/plugin-freeq`.

- [ ] **Step 5: Commit**

```bash
git add packages/apps/composer-app/package.json packages/apps/composer-app/src/plugin-defs.tsx packages/apps/composer-app/tsconfig.json pnpm-lock.yaml
git commit -m "feat(composer-app): register plugin-freeq"
```

---

### Task 11: Storybook + manual end-to-end verification

**Files:**
- Create: `packages/plugins/plugin-freeq/src/stories/FreeqChannel.stories.tsx`
- Modify: `packages/plugins/plugin-freeq/moon.yml` (add `storybook` tags/tasks if the story needs them — mirror `plugin-bluesky/moon.yml` storybook config if present)

**Interfaces:**
- Consumes: `FreeqChannel`/`makeFreeqChannel`, the `ChannelArticle` container from `@dxos/plugin-thread` (dev dependency), a running freeq server.

- [ ] **Step 1: Write the story** — a story that renders a `plugin-thread` channel bound to a `FreeqChannel` config. Follow `plugin-bluesky/src/stories/BlueskyChannel.stories.tsx` structure. Per the ECHO-in-stories rule, create the `FreeqChannel` inside a `render` function via `useMemo([], …)` + `createObject`, never in module-level `args`.

- [ ] **Step 2: Run Storybook** — reuse the user's running instance on :9009 if present (curl check); otherwise start on another port. Do NOT kill the user's storybook.

Run (only if none running): `moon run storybook-react:serve --port 9010`
Verify the `FreeqChannel` story renders the chat container.

- [ ] **Step 3: Confirm protocol shapes against the real server** (requires the user-provided server URL + test handle/app-password). Verify and, if needed, adjust:
  - SASL numeric codes and the `AUTHENTICATE` challenge/response JSON shapes in `IrcConnection.ts` / `CredentialProvider.ts` (`buildResponse`).
  - The REST message field names in `FreeqRestApi.getMessages`.
  - The PDS base URL used by the credential provider (via `resolveHandle`).

- [ ] **Step 4: Manual E2E** — with credentials configured, create a Composer channel with the Freeq backend, join a channel on the provided server, confirm: live inbound messages appear, history backfills, and sending a message posts a PRIVMSG that echoes back. Capture any shape mismatches and fix at the source module.

- [ ] **Step 5: Final verification**

Run: `moon run plugin-freeq:build && moon run plugin-freeq:test && moon run plugin-freeq:lint -- --fix`
Then: `git status` — confirm a clean tree (commit or acknowledge every change).

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/plugin-freeq
git commit -m "feat(plugin-freeq): add storybook story and finalize protocol shapes"
```

---

## Notes on remaining risk

- **Protocol shapes are provisional.** Three spots are explicitly isolated so a mismatch against the real server is a one-line fix, not a redesign: the SASL response builder (`CredentialProvider.buildResponse`), the SASL numeric-code `case`s (`IrcConnection`), and the REST decode (`FreeqRestApi.getMessages`). Task 11 confirms all three.
- **Credential storage** reuses plugin-bluesky's `AccessToken` pattern (`source: 'freeq'`); the app-password capture form and OAuth (Phase 2) are out of scope here.
- **`send` acquire/release** is intentionally minimal in Task 8 and tightened in Task 9; if reconnection semantics prove fiddly, promote the connection handle held by `subscribe` into the send path via a per-channel handle registry keyed on the `Channel` id.
```

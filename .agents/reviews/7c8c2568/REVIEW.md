---
branch: dm/cool-thompson-f258rv
commit: 7c8c2568a7c9231a8f7682ccfcea21559d2628c0
base: 042fcd3205b5381311e46d07aa87cf67e80fe7f4
mode: pr-only
createdAt: 2026-09-28T19:13:26.606Z
isFinalized: true
groups: 64
rules: [barrel-imports-not-internal-paths, consistent-file-naming-within-folder, consistent-private-field-convention, delete-dead-code-after-migration, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, no-impossible-state-handling, no-pointless-indirection, prefer-branded-types-over-raw-primitives, reuse-shared-test-layer]
reviewId: 7c8c2568
---

_0 error(s), 14 warning(s)._

# WARN 7c8c2568-1 barrel-imports-not-internal-paths `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts:17`

`../services/SandboxClient.ts` is imported directly instead of through the `services/` barrel. Export the wire types from `services/index.ts` and import from there.

# WARN 7c8c2568-2 error-messages-carry-context `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts:224:13`

`#sandboxDir` throws a raw `Error` (`Invalid sandbox id: ...`) for an invalid id. It does carry the id, but it is not a typed domain error, and every caller runs it inside an `Effect.gen`, so the throw surfaces as an untyped defect instead of a `SandboxService.SandboxError` the caller can match on. Return an `Effect` failing with `SandboxService.SandboxError` (or wrap the call in `Effect.try`) so the failure stays in the typed error channel, per the `error-messages-carry-context` rule.

# WARN 7c8c2568-3 consistent-file-naming-within-folder `packages/plugins/plugin-sandbox/src/services/HttpBackend.ts:1`

`services/` mixes naming patterns: `HttpBackend.ts` and `SandboxClient.ts` are PascalCase while the sibling backend `edge-backend.ts`, `exec-command.ts`, `layer.ts` and `sandbox-url.ts` are kebab-case. `HttpBackend.ts` (a module of free functions, not a class) and `edge-backend.ts` are the same kind of file, so rename `HttpBackend.ts` to `http-backend.ts` (updating `services/index.ts` and `capabilities/local-launcher.ts`) per the consistent-file-naming-within-folder rule.

# WARN 7c8c2568-4 delete-dead-code-after-migration `packages/plugins/plugin-sandbox/src/services/layer.ts:23`

`layerEdge` is exported but has no caller anywhere in the repo: the plugin uses `layerFromCapabilities`, the tests use `layer` and `layerLocal`, and `services/index.ts` does not re-export it. It is a leftover of the split into per-backend layers and should be deleted (rule `delete-dead-code-after-migration`); `layer` already builds the EDGE backend through `makeEdgeBackend`.

# WARN 7c8c2568-5 no-impossible-state-handling `packages/plugins/plugin-sandbox/src/services/layer.ts:66`

`setting()` returns `undefined` when the `Settings` or `AtomRegistry` capability is absent, so the preference silently degrades to `'edge'`. A missing registry in a plugin runtime is a wiring error and a user who chose local would be moved onto the network without notice; assert the registry with `invariant` (and read the settings capability once at the boundary) instead of falling back (rule `no-impossible-state-handling`).

# WARN 7c8c2568-6 consistent-private-field-convention `packages/plugins/plugin-sandbox/src/services/SandboxClient.ts:123`

`SandboxClient` mixes conventions: constructor parameter properties use TS `private readonly _base` / `_authHeader`, while the methods `#url` and `#send` use ES `#private`. Pick one for the whole class (per CLAUDE.md prefer `#private` in new code: make `_base` and `_authHeader` `readonly #base` / `#authHeader` fields).

# WARN 7c8c2568-7 prefer-branded-types-over-raw-primitives `packages/plugins/plugin-sandbox/src/services/SandboxClient.ts:226`

`SandboxClient.exposePort(spaceId: string, sandboxId: string, port: number)` adds another signature with the space id as a raw `string`; use the existing `SpaceId` brand for `spaceId` so a swapped argument is a type error.

# WARN 7c8c2568-8 barrel-imports-not-internal-paths `packages/plugins/plugin-sandbox/src/skills/functions/exec.ts:12`

`import { mergeExecEnv } from '../../services/sandbox-env.ts'` reaches past the `services/` barrel (`services/index.ts`) into an individual file. Export `mergeExecEnv` from the barrel and import it via `../../services/index.ts`, per the barrel-imports rule.

# WARN 7c8c2568-9 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-sandbox/src/skills/functions/exec.ts:22:5`

The handler is defined with an unnamed `Effect.fn(function* ...)`, which gives no span name. Per `effect-fn-not-hand-wrapped-gen`, use a named `Effect.fn('SandboxExec')(function* ...)`, or `Effect.fnUntraced` if no span is wanted.

# WARN 7c8c2568-10 no-pointless-indirection `packages/plugins/plugin-sandbox/src/skills/functions/exec.ts:26`

`const sandboxId = loaded.id;` and `const spaceId = db.spaceId;` are single-use aliases of trivially available values. Pass `loaded.id` and `db.spaceId` directly in the `sandboxService.exec(...)` call, as `expose-port.ts` already does (rule `no-pointless-indirection`).

# WARN 7c8c2568-11 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-sandbox/src/skills/functions/expose-port.ts:14:5`

The handler is defined with an unnamed `Effect.fn(function* ...)`, which gives no span name. Per `effect-fn-not-hand-wrapped-gen`, use a named `Effect.fn('SandboxExposePort')(function* ...)`, or `Effect.fnUntraced`.

# WARN 7c8c2568-12 reuse-shared-test-layer `packages/plugins/plugin-sandbox/src/templates/composer-plugin.test.ts:16:3`

The test hand-builds an `EchoTestBuilder` with its own open/close hooks and wraps the database with `Database.makeService(db)`, while the sibling `sandbox-env.test.ts` in this package gets the same database service from the shared `AssistantTestLayer({ types })`. Use `AssistantTestLayer` with the Project, Instructions, Text, TaskSet and Task types (via `it.effect`) and delete the local builder setup, per `reuse-shared-test-layer`.

# WARN 7c8c2568-13 barrel-imports-not-internal-paths `packages/plugins/plugin-sandbox/src/types/SandboxService.ts:12`

The type import from `../services/SandboxClient.ts` bypasses the `services/` barrel; import via `../services/index.ts` once the wire types are exported there.

# WARN 7c8c2568-14 prefer-branded-types-over-raw-primitives `packages/plugins/plugin-sandbox/src/types/SandboxService.ts:38`

The new `exposePort(spaceId: string, sandboxId: string, port: number)` types the space id as a bare `string` although `SpaceId` from `@dxos/keys` exists for exactly that concept (and the operation handler passes `db.spaceId`). Type `spaceId` as `SpaceId` (and thread it through `edge-backend.ts`, `HttpBackend.ts` and the local backend) so a swapped `spaceId`/`sandboxId` is caught by the compiler, per `prefer-branded-types-over-raw-primitives`.

---
branch: dm/nifty-planck-5j3mfk
commit: fb18fb629cba63fdbc576bda77eceacf3e2edd28
base: 3dbdc9256dfa7d691afa69ba087c7137b6173ce9
mode: pr-only
createdAt: 2026-09-28T23:43:44.182Z
isFinalized: true
groups: 70
rules: [bounded-live-state, import-as-namespace-is-all-or-nothing, no-mixed-promise-effect-lifecycle]
reviewId: fb18fb62
---

_1 error(s), 3 warning(s)._

# WARN fb18fb62-1 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-computer/src/templates/composer-plugin.test.ts:13:10`

Same as the template: a named member import (`SKILL_KEY as SANDBOX_SKILL_KEY`) from the `Sandbox` namespace module. Use `import * as Sandbox from '@dxos/plugin-sandbox/Sandbox'` and `Sandbox.SKILL_KEY`.

# WARN fb18fb62-2 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-computer/src/templates/composer-plugin.ts:11:10`

`Sandbox` is a namespace module (`@import-as-namespace`, exported as `@dxos/plugin-sandbox/Sandbox`), but this file pulls a member out with `import { SKILL_KEY as SANDBOX_SKILL_KEY }`. Import the whole namespace (`import * as Sandbox from '@dxos/plugin-sandbox/Sandbox'`) and use `Sandbox.SKILL_KEY`, per import-as-namespace-is-all-or-nothing.

# WARN fb18fb62-3 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-sandbox/src/local/server.test.ts:104:9`

A plain `throw new Error(...)` inside `Effect.gen` bypasses Effect's typed-error channel (no-mixed-promise-effect-lifecycle). Use `return yield* Effect.fail(new Error(...))` (or `Effect.die`/an assertion via `expect`) instead.

# ERROR fb18fb62-4 bounded-live-state `packages/plugins/plugin-sandbox/src/local/server.ts:163`

`publish` adds one entry to the long-lived `published` map on every call (each mints a fresh random key) and nothing ever removes entries or checks a maximum, so the helper's map grows with every publish for as long as it runs. Add a named, documented constant (e.g. `MAX_PUBLISHED_DIRECTORIES`, saying it protects the helper's memory) and reject the call with a typed `SandboxError` before `published.set` when exceeded, or reuse the existing key when the same `spaceId`/`sandboxId`/`path` is republished, per the bounded-live-state rule.

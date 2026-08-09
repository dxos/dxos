# Agent Debug Channel — Scoping & Extension Design

- **Date:** 2026-08-08
- **Status:** Option 1 implemented (see §6); Options 2–3 remain proposals.
- **Motivation:** Debugging the 2026-08-08 Composer boot hang took ~8 copy/paste round trips
  (agent writes a probe → user pastes it into DevTools → agent reads a screenshot). Two probes were
  wrong and had to be retried. Every one of those round trips was a human relaying a string.
- **Packages in scope:** `packages/apps/composer-app` (recovery debug port),
  `packages/devtools/devtools-extension` (dormant), `packages/apps/composer-crx` (live).

## 1. What actually cost time

Not access — **latency and blindness**. The agent could not see the result of a probe without a
human in the loop, so a malformed expression cost a full round trip instead of a retry. Concretely,
`dxos.get('dxn:echo:…')` returned `undefined` and it took another exchange to establish that the
probe was wrong rather than the data being missing.

The requirement is therefore narrow: **let an agent evaluate an expression in the live Composer
page and read the structured result.** A rendered UI panel is a separate, lesser want.

## 2. Option 1 — extend the existing debug port to the running app

### What already exists

`runDebugPortLoop` (`packages/apps/composer-app/src/recovery/debug-port.ts`) is **already generic**.
Its options are `{ session, origin, evalCommand, onLog, signal }` — there is nothing
recovery-specific in it. It long-polls `GET /poll?session=…` on `http(s)://127.0.0.1:9321`, runs
whatever code arrives through the caller-supplied `evalCommand`, and posts the serialized result
back to `POST /result`. The agent side (`.agents/skills/composer-forensics/scripts/composer-recovery.js`)
already speaks that protocol.

The only reason it is safe-mode-only is **where it is mounted**: `pages/recovery.ts:275` is the sole
caller, and it binds `evalCommand` to the static globals plus `recoveryHelpers`:

```ts
evalCommand: async (code) => {
  const dxos = getDxos();
  const runner = new Function('dxos', 'recovery', `"use strict"; return (async () => { ${code} })();`);
  return runner(dxos, recoveryHelpers);
};
```

### The change

Mount the same loop in the main app entry with `evalCommand` bound to the **live** devtools hook.
`mountDevtoolsHooks` already exposes `client`, `halo`, `spaces`, `get`, `Filter`, `Obj`, `Query`,
`diagnostics` — i.e. every probe used during this investigation would have worked unmodified.

Work items:

1. A `debug-port` module in `composer-app` that mounts the loop against the live `dxos` hook.
   Reuses `runDebugPortLoop`, `resolveRecoveryDebugOrigin`, and the constants verbatim.
2. A start/stop affordance that surfaces the session id — `plugin-debug`'s settings panel is the
   natural home; it is already a developer surface.
3. Nothing on the agent side. `composer-recovery.js` is unchanged.

### Gating (non-negotiable)

This is arbitrary `eval` in a page holding the user's data. It must be:

- **Off by default**, started only by an explicit user gesture, per session, never persisted.
- **Session-scoped** — a fresh `crypto.randomUUID()` per activation, as recovery already does.
- **Loopback-only** — `127.0.0.1`, which the existing origin resolver enforces.
- Visibly indicated while running, and stopped on reload.

### Cost and value

Small — it is a mount point, a toggle, and a doc line. It closes the exact gap that hurt: reaching
the **live client** instead of safe mode. No extension, no permissions, no distribution, no review.

## 3. Option 2 — an actual extension

Two candidate hosts. The decision hinges on one fact: **a content script cannot see the page's
`window.dxos`.** Isolated worlds mean any extension needs either
`chrome.scripting.executeScript({ world: 'MAIN' })`, a page-injected script with a `CustomEvent`
relay, or the DevTools eval API.

### (a) Revive `packages/devtools/devtools-extension`

State: `private: true`, ~299 lines across `background/content/devtools/panel/dxos-hook/sandbox`,
`moon.yml` carries only `typecheck` + `vite` (no build/test task). Its last commit is a repo-wide
knip sweep (`bcfe4c56b7`, 2026-08-06) — maintenance, not feature work. It hosts `@dxos/devtools` in
a DevTools panel against the inspected page's client.

**For:** `chrome.devtools.inspectedWindow.eval` runs in the MAIN world natively — no injection
dance, no relay, no host permissions for arbitrary origins. A DevTools panel is also the honest home
for a diagnostics table (spaces, states, tags, pending/unavailable counts). Being internal-only, a
remote-eval channel here carries a fraction of the risk it would in a shipped product.

**Against:** dormant, so reviving it means re-establishing a build/test task and verifying it still
loads. It only works while DevTools is open on the tab, and MV3 service-worker lifetime makes a
long-poll loop awkward — the loop belongs in the panel, which dies when DevTools closes.

### (b) Extend `packages/apps/composer-crx`

State: alive (0.10.4), MV3, side panel + background hub + content script on all pages,
`webext-bridge` internally, `@dxos/crx-protocol` shared with `plugin-crx`, an approved architecture
doc (`2026-07-02-composer-crx-design.md`), storybook and tests.

**For:** it already solves the hard part. `content.ts` runs an **origin-guarded MAIN-world relay** to
Composer tabs (`CustomEvent` ⇄ `chrome.runtime`, `isComposerUrl`), which is precisely the transport
an eval channel needs. It has a background hub for a long-poll loop and a versioned protocol package
to extend rather than a new ad-hoc message set.

**Against — and this is decisive:** `composer-crx` is a **user-facing product** extension with
`host_permissions: ['http://*/*', 'https://*/*']`. Adding an agent-driven remote-eval channel to it
means shipping, to end users, an extension that can execute arbitrary code in their Composer tab on
instruction from a local socket. That is a materially different security posture from a debugging
tool, and it would have to survive store review on those permissions.

### Recommendation

**Do Option 1 first; if a standing UI is still wanted, revive (a); do not put this in (b).**

Option 1 delivers the capability that mattered, reusing code that already exists and requiring no new
extension permissions. It is not free of attack surface: it adds a loopback endpoint that evaluates
arbitrary code in a production page. What bounds that is the gesture (off until the user flips the
switch), the per-activation session id, the loopback-only origin check, and the fact that a reload
stops it — a page an attacker can already run script in needs none of this, and one they cannot is
unaffected until the user opts in. Reviving (a) is the right home for a _panel_ because `inspectedWindow.eval` is the
correct primitive and internal-only distribution keeps remote eval out of the product. (b) has the
best transport, but the cost of putting an eval channel into a user-facing extension with universal
host permissions is not worth saving the injection work — and Option 1 avoids that work entirely by
not being an extension.

## 4. What a panel would show

If (a) is revived, the panel earns its keep by rendering the tables the agent had to hand-assemble
during this investigation, live:

| Panel           | Columns                                                         |
| --------------- | --------------------------------------------------------------- |
| Spaces          | id, state, tags, properties present, edge replication, root url |
| Space internals | `_objects.size`, pending document loads, unavailable objects    |
| Object probe    | id → core / pending / unavailable / handle / inline / link      |
| Triggers        | id, enabled, spec, runnable present, last error                 |

Every row above corresponds to a probe that cost a round trip on 2026-08-08.

## 5. Open questions

1. Should the live debug port ship in production builds gated behind a user gesture, or only in
   dev/staging builds? Production access is what made this session's remote debugging possible at
   all — the user was on `labs.composer.space`, not localhost.
2. Does the loopback long-poll survive the MV3 service-worker lifetime if it ever moves into an
   extension, or must it live in a panel/document context?
3. Is there appetite for a read-only variant (structured queries, no `eval`) that could ship more
   broadly with a far smaller blast radius?

## 6. Outcome

Option 1 shipped. Q1 is answered; Q2 and Q3 stay open.

**Q1 — production, behind a gesture.** Dev/staging-only gating would have excluded the exact session
that motivated this (`labs.composer.space`). The gating in §2 carries the risk instead: off by
default, one explicit gesture, a fresh session id per activation, nothing persisted, loopback-only,
visibly indicated, stopped on reload.

**One divergence from §2's work items.** Item 1 places the mount module in `composer-app`, which
conflicts with item 2: `plugin-debug` cannot import from `composer-app` — the dependency runs the
other way. The loop therefore moved to `@dxos/client/devtools`, which `plugin-debug` already reaches
via `@dxos/react-client/devtools`, and `pages/recovery.ts` imports it back from there. Constants lost
their `RECOVERY_` prefix (`resolveDebugPortOrigin`, `DEBUG_PORT_RECONNECT_MS`) since they are no
longer recovery-specific.

What landed:

| Piece                                  | Location                                                          |
| -------------------------------------- | ----------------------------------------------------------------- |
| Long-poll loop (body unchanged)        | `packages/sdk/client/src/devtools/debug-port.ts`                  |
| Start/stop + subscribable status       | `packages/sdk/client/src/devtools/debug-port-controller.ts`       |
| `dxos.debugPort` on the hook           | `packages/sdk/client/src/devtools/devtools.ts`                    |
| Settings switch, session id, log       | `packages/plugins/plugin-debug/src/containers/DebugPortSettings/` |
| Recovery chrome, extracted + storyable | `packages/apps/composer-app/src/recovery/{ui.ts,ui.css}`          |

`composer-recovery.js` is unchanged, as §2 item 3 requires.

**Q3 is cheaper than assumed.** `DebugPortController.start({ scope })` takes the binding set, so a
read-only variant is a second scope factory exposing structured accessors instead of the raw hook —
not a second protocol.

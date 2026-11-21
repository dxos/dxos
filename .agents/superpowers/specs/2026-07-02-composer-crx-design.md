# Composer CRX — Architecture & Protocol Design

- **Date:** 2026-07-02
- **Status:** Approved design (target architecture; implemented incrementally)
- **Packages:** `packages/apps/composer-crx` (the extension), `packages/plugins/plugin-crx` (the Composer-side plugin), and a new `@dxos/crx-protocol` (shared schema).

## 1. Overview

The Composer browser extension (CRX) has grown organically and its architecture is no longer
legible. This document defines the **target architecture**: the runtime components and their
boundaries, the state the extension owns, a **formalized, extensible protocol** for the extension's
communication with Composer (running in another tab), the split of user-facing functionality, and
an **auth model** for reaching EDGE services.

This is a north star, not a description of today. It is implemented across several plans (see
§9); each is independently shippable.

### Problems with the current design

- **Duplicated protocol.** `plugin-crx/src/types/PageAction.ts` defines the exchange in effect
  `Schema`; `composer-crx` keeps a **hand-validated mirror** (`core/actions/types.ts`,
  `core/proxy/types.ts`) with hand-rolled `decode*` guards and a comment that it "MUST be updated
  in lockstep." The two drift.
- **No auth.** The CRX reaches EDGE anonymously (`new EdgeServiceClient({ baseUrl })`,
  `useAgent({ host })` with bare URLs). There is no user identity, token, or HALO device.
- **Unclear boundaries.** Transport, state, and feature logic are interleaved; there is no single
  description of which context (content script / background / panel) owns what.

## 2. Goals & non-goals

**Goals**

- One shared, versioned, extensible protocol module for all CRX↔Composer message exchanges,
  expressed as effect `Schema` and consumed by both `plugin-crx` and `composer-crx`.
- Clear component responsibilities and a single typed state layer.
- A hybrid auth model that lets standalone features work without a Composer tab while delegating
  space/data access to Composer when present.
- A **mock Composer peer** so protocol message-passing is testable in both directions without a
  browser.

**Non-goals**

- Rewriting feature behavior (chat, page actions, proxy) — only their transport and boundaries change.
- Extension-internal messaging (panel↔background↔content) is out of scope for the shared protocol;
  it stays on `webext-bridge`. The shared protocol is specifically the **cross-tab** surface.

## 3. Components

| Context                       | Role                                                                                                   | Owns                                                                                                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **content script**            | Transport bridge + page helpers. Injected on all pages; origin-guarded to Composer URLs for the relay. | `CustomEvent` ⇄ `chrome.runtime` relay; picker host; extract/predicate helpers. Kept dependency-lean (no app-framework, no EDGE client).                                                                           |
| **background service worker** | The hub.                                                                                               | Protocol dispatch; registry refresh; page-action run/deliver; proxy render; **EDGE/auth session** (device credential, token refresh); context menu; side-panel open behavior; on-install content-script injection. |
| **side panel**                | Primary UI.                                                                                            | Assistant chat; plugin toolbar actions; thumbnail. Talks to background/content via `webext-bridge`.                                                                                                                |
| **options page**              | Configuration + the **device-pairing entry point**.                                                    | Renders/edits Config state (§4).                                                                                                                                                                                   |

## 4. State

All persistent state moves behind a small **typed state module** (schema-validated `get` / `set` /
`subscribe`) that replaces the scattered `browser.storage` calls and string prop constants.

- **Config** — `browser.storage.sync` (user-set, synced across the user's browsers): developer mode,
  space mode, current space id, configured Composer URLs.
- **Session** — `browser.storage.local` (per-install): the **HALO device credential / EDGE token**
  (new), the cached page-action registry, the thumbnail hand-off value.
- **Ephemeral** — background service-worker memory: `lastUsedTabId`, connected content-script ports,
  in-flight protocol requests.
- **Panel UI** — React state (active tab, chat transcript) — transient, not persisted here.

> Note: extension `storage.local` is not a secure enclave. The device credential is stored there
> (the standard for MV3); the threat model is "anyone with the unpacked profile," matching any
> local client. This is accepted as part of choosing a standalone credential.

## 5. Protocol module — `@dxos/crx-protocol`

The core of the redesign. A **new neutral package** containing only effect `Schema` (its sole
runtime dependency is `effect`; operations are referenced by string id so it needs no
`@dxos/compute`/app-framework). Both `plugin-crx` and `composer-crx` depend on it, and
`composer-crx`'s hand-rolled `decode*` mirror is deleted.

`"private": true` until a trusted publisher is configured (per repo policy for new packages).

### 5.1 Considered approaches

- **A (chosen)** — new neutral `@dxos/crx-protocol` imported by both sides.
- **B (rejected)** — `composer-crx` imports the schemas from `plugin-crx`. Impossible: `plugin-crx`
  transitively pulls `@dxos/app-framework`, which the extension must not bundle.
- **C (rejected)** — keep the duplicated mirror plus a lockstep/codegen test. This is the current
  pain; it trades silent drift for noisy drift.

### 5.2 Shape

- A versioned **`Envelope { version, id, type }`** wraps a `Schema.Union` of tagged `Request` /
  `Response` variants (one tag per message kind).
- A transport-agnostic **codec** (encode/decode via `Schema`) and a **request/response correlation**
  helper keyed on `id`. Malformed payloads decode to a typed error ack, never a throw across the
  boundary.
- **Extending the protocol** = add a schema variant + register a handler; both sides get the types
  immediately. Unknown/newer `type` or `version` yields `unsupportedVersion`/`unknownType` acks
  rather than a hard failure (forward compatibility).

### 5.3 Transport & `Channel`

The protocol is defined against a **`Channel`** interface (`send`, `onMessage`), not a concrete
transport. The production transport is unchanged: the content script relays page `CustomEvent`s ⇄
`chrome.runtime` messages, origin-guarded to Composer URLs. A `Channel` implementation adapts each
side; the protocol module knows nothing about `chrome.*` or `window`.

### 5.4 Message families (cross-tab)

- **`page-actions`** — `ready` (Composer announces; extension refreshes registry), `list` (extension
  pulls descriptors), `invoke` (extension runs an action's operation in Composer).
- **`deliver`** — extension sends a picked/extracted `Snapshot` to a Composer operation.
- **`proxy`** — Composer → extension `render` (render a URL in a background window, return HTML) and
  `ping` (liveness / extension manifest identity).
- **`auth`** — HALO **device-admission** handshake (§7) and **delegated** requests (resolve space,
  run a query, obtain a scoped EDGE token) that ride an authenticated Composer tab.

Directionality is explicit per variant: `page-actions`/`deliver` are extension→Composer;
`proxy`/`ping` are Composer→extension; `auth` is bidirectional (pairing is Composer-initiated,
delegated calls are extension-initiated).

## 6. Functionality taxonomy

1. **User-invoked in the side panel** — e.g. the **assistant chat**. Runs in the panel; uses the
   **standalone** EDGE credential (chat-agent), optionally enriched with space/data via the
   delegated `auth` path.
2. **Plugin-injected toolbar actions** — page actions contributed by Composer plugins (`plugin-crx`
   and others via the page-action capability), surfaced in the panel toolbar / context menu. Flow:
   match to page → `Snapshot` (extractor or picker) → `deliver` to the target operation. Bookmarks
   are one such plugin.
3. **Composer-initiated (proxy)** — Composer calls _into_ the extension to read the current page or
   fetch/search the web, using the extension's cross-origin privilege to bypass page CORS.

Each bucket maps cleanly onto §5's message families: (1) is mostly local + delegated `auth`, (2) is
`page-actions` + `deliver`, (3) is `proxy`.

## 7. Auth model — hybrid

The CRX has both a standalone credential and a delegated path.

- **Pairing (one-time).** Composer initiates HALO **device admission** over the `auth` family; the
  CRX joins the user's HALO as a device and stores the resulting device credential in Session state.
  Pairing is offered from the options page / side panel and completed through an open Composer tab.
- **Standalone.** The background authenticates to EDGE **directly as that device** for
  tab-independent features (assistant chat, image-service). These work with no Composer tab open.
- **Delegated.** Space/data access (queries, operation targets, space resolution) routes through an
  open, signed-in Composer tab via the `auth` family.
- **Degradation.** With no Composer tab present: standalone features keep working; delegated features
  are disabled with an explanatory hint (never a silent failure). Before pairing: the extension
  operates in a limited/anonymous mode and prompts to pair.

## 8. Testing — mock Composer peer

Because the protocol is transport-agnostic (§5.3), the peer can be faked in-process.

- `@dxos/crx-protocol/testing` ships a **`LoopbackChannel`** (a wired pair of channels) and a
  **`MockComposer`**. Messages pass through the **real codec** (`Schema` encode/decode + `id`
  correlation), so tests catch schema drift, envelope/version bugs, and correlation errors — not
  just happy-path object passing.
- **Both directions** are exercised against the same mock:
  - extension → Composer: `page-actions` `list`/`invoke`, `deliver`, and the `auth` device-pair
    handshake. The `MockComposer` binds the **actual `plugin-crx` handlers** (`handleListEvent` /
    `handleInvokeEvent`, which already take plain schema types) so the real Composer-side logic is
    under test, not a reimplementation.
  - Composer → extension: `proxy` `render`/`ping` (the mock initiates; the extension end responds).
- A **conformance suite** lives with the schema: every `Request` variant has a round-trip case and a
  rejection case (malformed → typed error ack), run once in the shared package so neither side
  re-tests it.
- This is distinct from the existing Storybook browser-API stubs (`webextension-polyfill`, `agents`,
  `webext-bridge/popup`): those fake `chrome.*`; this fakes the _peer_.

## 9. Implementation phases

Each phase is an independent plan → implementation cycle.

1. **Extract `@dxos/crx-protocol`.** Move the effect `Schema` out of `plugin-crx/types/PageAction.ts`
   into the new package (operations as string ids); add the `Envelope`, `Channel`, codec, correlation
   helper, `LoopbackChannel`/`MockComposer`, and the conformance suite. Repoint `plugin-crx`.
2. **Adopt in `composer-crx`.** Replace the hand-rolled `decode*` mirror with the shared schema;
   introduce the `Channel` adapter in the content-script relay; keep behavior identical.
3. **Typed state module.** Replace scattered `browser.storage` calls / prop constants with the
   schema-validated Config/Session layer.
4. **Auth.** HALO device-admission handshake over the `auth` family; background EDGE session
   (standalone credential + token refresh); delegated space/data path; degradation UX.
5. **Consolidation.** Fold `render`/`ping` and `deliver` onto the unified protocol; retire ad-hoc
   runtime message-type constants where the shared protocol supersedes them.

## 10. Risks & open questions

- **`@dxos/compute` `Operation` type.** The current schema references it type-only; the neutral
  package will represent operations by string id and let each side map ids to operations, avoiding
  the dependency. Confirm no other consumer needs the richer type at the protocol boundary.
- **EDGE acceptance of a CRX device credential.** Assumes EDGE authorizes a HALO device credential
  the same way it does for other devices; validate against the EDGE auth surface before phase 4.
- **`webext-bridge` vs. the shared protocol.** Internal messaging stays on `webext-bridge`; ensure
  the two do not blur (the `Channel` boundary is only the cross-tab peer).
- **Pairing UX** (where the code/approval surfaces) is sketched, not specified; refine in phase 4.

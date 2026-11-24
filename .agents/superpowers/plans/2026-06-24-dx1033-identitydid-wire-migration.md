# DX-1033 — Finish identityDid wire-type migration (dxos + edge) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flip every category-A _identifier_ field on the edge contract from hex `identityKey`/`ownerPublicKey` to `did:halo:` `identityDid`/`ownerUri`, in both `@dxos/protocols` (dxos) and `@dxos/edge-protocol` + handlers (edge), while preserving the pre-migration shapes as `@deprecated` types so the delayed-deploy Composer keeps working.

**Architecture:** Per-field **expand-then-defer-contract**. The DID form becomes the canonical wire type; the old hex shape is preserved verbatim as a separate `@deprecated` type in a new `protocols/src/edge/edge-deprecated.ts` (dxos) and mirrored on edge. The edge already normalizes hex-or-DID at runtime via `toIdentityDid`, so this is a **type/contract** change, not a behavior change — the back-compat work is making edge _dual-accept_ the legacy request shapes. Dropping the deprecated types is **out of scope** (future phase 7, gated on Composer redeploy + telemetry).

**Tech Stack:** TypeScript, Effect Schema (edge request validators), Hono (edge routes), moon (build/test/lint) in dxos, the edge repo's own moon tasks; cross-repo dev linking via edge `scripts/link-packages.mjs` (`.local-pack` tarballs — **never committed**).

---

## Context & references

- Linear: [DX-1033](https://linear.app/dxos/issue/DX-1033) — follow-up to DX-995.
- DX-995 background docs (read-only, in `~/dev/`): `DX995_PROGRESS.md`, `DX995_WIRE_TYPES_AUDIT.md`, `DX995_PHASE7_DROP_LEGACY.md`. The wire-type rename was **deliberately deferred** from DX-995 ("the server already normalizes both forms (`toIdentityDid`)"); this plan executes that deferral with the back-compat twist the task requires.
- Edge runtime is already DID-primary (registry keyed by `ownerIdentityDid`; `toIdentityDid` normalizer present). main/prod/dev are deployed DID-only; staging/labs deploy + the cross-repo `PeerData` holdout are **NOT** part of this task.
- dxos worktree (this repo): `/Users/mykola/dev/dxos/.claude/worktrees/relaxed-haibt-e66bc7`, branch `claude/relaxed-haibt-e66bc7`.
- edge repo: `/Users/mykola/dev/edge`, base branch `main` (PRs #666/#667/#668 merged).

### Classification (from the audit) — what migrates vs what stays

**Migrate to DID (category A — identifier / lookup / routing / display):** all the fields enumerated in the file structure below.

**Do NOT migrate (category B — signer / key-material; a `did:halo:` is a one-way hash and cannot sign):**

- `JoinSpaceRequest.identityKey` + `signature` (verified for `KNOWN_PUBLIC_KEY` auth).
- `RecoverIdentityRequest.deviceKey`, `RecoverIdentityResponseBody.identityKey` (recovered key material the client _operates_).
- `deviceKey` / `agentKey` / `peerKey`, `haloSpaceKey` / `genesisFeedKey` / `controlFeedKey`, credential issuer/subject keys.

Leave every category-B field exactly as-is. If a task tempts you to touch one, stop — it's a finding, not a step.

---

## The back-compat model (READ THIS FIRST — it governs every task)

Composer (the dxos client app) deploys on a **delay** after edge. So during the window: **new edge + old Composer**. The migration must keep old Composer working. The directions are asymmetric:

1. **Requests (Composer → edge): FULL back-compat, the critical path.**
   - New dxos client sends the **DID** form (`identityDid`, `ownerUri`).
   - Edge **dual-accepts**: its request schema accepts the new field **OR** the legacy field, and normalizes to a DID via the existing `toIdentityDid` (hex-or-DID → DID). Old Composer (sending hex `identityKey`/`ownerPublicKey`) keeps working.

2. **Responses (edge → dxos CLI): forward-only, dev-tooling.**
   - The identity-carrying responses (`Inspect*`, `ListActiveIdentities`, `Delete*`, `SpaceActivity`) are consumed **only by the devtools CLI** (`packages/devtools/cli`), which deploys _with_ the code — it is NOT the Composer deploy-delay concern.
   - Edge emits the **new** (`identityDid`) field. The CLI reads the new field, with a cheap **cast-free** top-level dual-read (`'identityDid' in r ? r.identityDid : r.identityKey`) so a new CLI still renders against a not-yet-redeployed edge (staging/labs). Nested fields (space members) read the new field only — the transition gap is acceptable for dev tooling.

3. **`edge-deprecated.ts` (dxos):** preserves the OLD wire shapes as `@deprecated` types — the canonical record of the legacy contract and the type backing the CLI dual-read. Required by the task; kept regardless of how many consumers import it.

4. **Tier-2 edge-internal RPC (DO↔DO):** no Composer involvement and both ends deploy atomically inside edge, so these are a **straight rename** (no deprecated types). The values are already dual-accepted at runtime via `toIdentityDid`; producers must be updated to emit DIDs.

**Deprecated-type naming:** `Legacy`-prefixed (e.g. `LegacyCreateAgentRequestBody`), defined as `Omit<New, 'newField'> & { oldField: ... }` where the shape is large, or a full literal where small. The `Omit` of the new field is what makes `'identityDid' in r` discriminate the union cast-free.

---

## File structure

### dxos repo (this worktree) — **PR #1**

| File                                                                                                           | Responsibility                             | Change                                                                       |
| :------------------------------------------------------------------------------------------------------------- | :----------------------------------------- | :--------------------------------------------------------------------------- |
| `packages/core/protocols/src/edge/edge.ts`                                                                     | client↔edge HTTP wire types                | rename identifier fields to DID (see Task 1.2)                               |
| `packages/core/protocols/src/edge/edge-deprecated.ts`                                                          | **NEW** — `@deprecated` legacy wire shapes | create (Task 1.1)                                                            |
| `packages/core/protocols/src/edge/index.ts`                                                                    | edge barrel                                | add `export * from './edge-deprecated.ts'`                                   |
| `packages/core/mesh/edge-client/src/edge-http-client.ts`                                                       | EdgeHttpClient request builders            | `uploadFunction` reads `ownerUri`; `getAgentStatus` builds DID path          |
| `packages/sdk/client-services/src/packlets/agents/edge-agent-manager.ts`                                       | client agent ops                           | `createAgent` sends `identityDid`; `getAgentStatus` sends `ownerIdentityDid` |
| `packages/plugins/plugin-script/src/skills/functions/deploy.ts` · `src/util/deploy.ts`                         | function deploy producers                  | pass `ownerUri` (DID) instead of `ownerPublicKey`                            |
| `packages/devtools/cli/src/commands/admin/identity/{list,inspect,delete}.ts` · `admin/space/{inspect,list}.ts` | admin CLI consumers                        | dual-read `identityDid` (top-level)                                          |

### edge repo (`~/dev/edge`) — **PR #2**

| File                                                                                                    | Responsibility                                        | Change                                                                           |
| :------------------------------------------------------------------------------------------------------ | :---------------------------------------------------- | :------------------------------------------------------------------------------- |
| `packages/sdk/edge-protocol/src/services/admin-service.ts`                                              | admin RPC/HTTP types                                  | rename identifier fields to DID (Tier 1 + Tier 2 `ResolveIdentitySpacesRequest`) |
| `packages/sdk/edge-protocol/src/services/agents-service.ts`                                             | agents RPC types                                      | rename to DID (Tier 2)                                                           |
| `packages/sdk/edge-protocol/src/services/router.ts`                                                     | router RPC types                                      | `GetConnectedDevices*` → DID (Tier 2)                                            |
| `packages/sdk/edge-protocol/src/services/data-service.ts`                                               | data-service RPC types                                | `isSpaceMember`/`getSpaceMemberKeys` → DID (Tier 2)                              |
| `packages/services/agents/src/validator.ts`                                                             | createAgent request schema                            | dual-accept `identityDid` ∪ legacy `identityKey`                                 |
| `packages/services/agents/src/api.ts`                                                                   | `/agents/create` + `/users/:id/agent/status` handlers | normalize to DID, dual-accept                                                    |
| `packages/services/agents/src/registry/registry.ts` · `entrypoint.ts`                                   | agents RPC handlers                                   | rename param names; keep `toIdentityDid` normalization                           |
| `packages/services/functions-service/src/api.ts`                                                        | functions upload handler                              | already dual-accepts; align field naming/comments                                |
| `packages/services/edge/src/admin.ts` · `data-management/data-management.ts` · `data-management/api.ts` | admin/data producers + auth                           | emit `identityDid`; pass DID to RPCs; membership checks via DID                  |
| `packages/services/router/src/worker/entrypoint.ts` · `packages/services/edge/src/diagnostics.ts`       | router handler + producer                             | `GetConnectedDevices*` → DID                                                     |
| `packages/services/db-service/src/worker/entrypoint/data-service.ts` · `space/space-state-machine.ts`   | data-service handler                                  | derive DID at read boundary (members)                                            |
| test files (see tasks)                                                                                  | dual-accept + rename coherence                        | extend agents/edge/data-management suites                                        |

---

## Phase 0 — Edge worktree + baseline (no code changes yet)

### Task 0.1: Create the edge worktree

**Files:** none (git op).

- [ ] **Step 1: Create the worktree + branch in the edge repo**

```bash
git -C /Users/mykola/dev/edge worktree add \
  /Users/mykola/dev/edge/.claude/worktrees/dx-1033-finish-identitydid \
  -b claude/dx-1033-finish-identitydid origin/main
```

- [ ] **Step 2: Verify it was created**

```bash
git -C /Users/mykola/dev/edge worktree list
```

Expected: a line ending `.claude/worktrees/dx-1033-finish-identitydid  <sha> [claude/dx-1033-finish-identitydid]`.

- [ ] **Step 3: Baseline install (non-interactive)**

```bash
cd /Users/mykola/dev/edge/.claude/worktrees/dx-1033-finish-identitydid && CI=true HUSKY=0 pnpm install
```

Expected: install completes (the `DEPOT_TOKEN` warning is normal).

- [ ] **Step 4: Baseline build of the packages we will touch**

```bash
cd /Users/mykola/dev/edge/.claude/worktrees/dx-1033-finish-identitydid && moon run edge-protocol:build agents:build edge:build
```

Expected: green. (If a target name differs, `moon query projects` lists them.) This is the pre-change baseline — record any pre-existing failure (the `triggers-dispatcher` "space compute environment" test is a known unrelated flake per `DX995_PROGRESS.md`).

---

## Phase 1 — dxos `@dxos/protocols`: DID-primary types + `edge-deprecated.ts`

### Task 1.1: Create `edge-deprecated.ts`

**Files:**

- Create: `packages/core/protocols/src/edge/edge-deprecated.ts`
- Modify: `packages/core/protocols/src/edge/index.ts`

- [ ] **Step 1: Create the deprecated-types module**

Write `packages/core/protocols/src/edge/edge-deprecated.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { type SpaceId } from '@dxos/keys';

import {
  type CreateAgentRequestBody,
  type DeleteIdentityRequest,
  type DeleteIdentityResponse,
  type InspectIdentityResponse,
  type InspectSpaceResponse,
  type ListActiveIdentitiesResponse,
  type SpaceActivityEntry,
  type UploadFunctionRequest,
} from './edge.ts';

//
// DX-1033 — legacy (pre-identityDid) wire shapes.
//
// These carry identity as a hex `identityKey`/`ownerPublicKey`. They are retained so the Edge
// continues to accept requests from, and the devtools CLI can still read responses produced by,
// clients/servers that predate the DID migration (notably Composer, which deploys on a delay).
// Drop in phase 7 once telemetry shows no legacy senders remain (see DX995_PHASE7_DROP_LEGACY.md).
//
// Each type omits the new DID field and re-adds the old hex field, so a `New | Legacy` union is
// discriminable cast-free via `'identityDid' in value`.
//

/** @deprecated Pre-DX-1033 shape; use {@link CreateAgentRequestBody} (`identityDid`). */
export type LegacyCreateAgentRequestBody = Omit<CreateAgentRequestBody, 'identityDid'> & {
  /** @deprecated Hex identity key; send `identityDid` instead. */
  identityKey: string;
};

/** @deprecated Pre-DX-1033 shape; use {@link UploadFunctionRequest} (`ownerUri`). */
export type LegacyUploadFunctionRequest = Omit<UploadFunctionRequest, 'ownerUri'> & {
  /** @deprecated Hex owner public key; send `ownerUri` (the owner identity DID) instead. */
  ownerPublicKey: string;
};

/** @deprecated Pre-DX-1033 shape; use {@link ListActiveIdentitiesResponse} (`identityDid`). */
export type LegacyListActiveIdentitiesResponse = {
  identities: {
    /** @deprecated Hex identity key; read `identityDid`. */
    identityKey: string;
    haloSpaceId: string | null;
    createdAt: string | null;
    agentKey: string | null;
    hasRecovery: boolean;
  }[];
  cursor?: string;
  complete: boolean;
  totalCount: number;
};

/** @deprecated Pre-DX-1033 shape; use `InspectIdentityRequest` (`identityDid`). */
export type LegacyInspectIdentityRequest = {
  /** @deprecated Hex identity key; send `identityDid`. */
  identityKey: string;
};

/** @deprecated Pre-DX-1033 metadata shape; use the `identityDid` form. */
export type LegacySpaceMetadata = {
  createdAt: string;
  /** @deprecated Hex identity key; read `identityDid`. */
  identityKey?: string;
  status?: 'active' | 'deleting';
};

/** @deprecated Pre-DX-1033 member shape; use the `identityDid` form. */
export type LegacySpaceMember = {
  /** @deprecated Hex identity key; read `identityDid`. */
  identityKey: string;
  role?: string;
  agentKey?: string;
};

/** @deprecated Pre-DX-1033 shape; use {@link InspectSpaceResponse} (`identityDid`). */
export type LegacyInspectSpaceResponse = Omit<InspectSpaceResponse, 'metadata' | 'members' | 'spaceId'> & {
  spaceId: string;
  metadata: LegacySpaceMetadata | null;
  members: { count: number; list: LegacySpaceMember[] };
};

/** @deprecated Pre-DX-1033 shape; use {@link InspectIdentityResponse} (`identityDid`). */
export type LegacyInspectIdentityResponse = Omit<InspectIdentityResponse, 'identityDid' | 'spaces'> & {
  /** @deprecated Hex identity key; read `identityDid`. */
  identityKey: string;
  spaces: LegacyInspectSpaceResponse[];
};

/** @deprecated Pre-DX-1033 shape; use {@link SpaceActivityEntry} (`identityDid`). */
export type LegacySpaceActivityEntry = Omit<SpaceActivityEntry, 'metadata'> & {
  metadata: LegacySpaceMetadata | null;
};

/** @deprecated Pre-DX-1033 shape; use {@link DeleteIdentityRequest} (`identityDid`). */
export type LegacyDeleteIdentityRequest = Omit<DeleteIdentityRequest, 'identityDid'> & {
  /** @deprecated Hex identity key; send `identityDid`. */
  identityKey: string;
};

/** @deprecated Pre-DX-1033 shape; use {@link DeleteIdentityResponse} (`identityDid`). */
export type LegacyDeleteIdentityResponse = Omit<DeleteIdentityResponse, 'identityDid'> & {
  /** @deprecated Hex identity key; read `identityDid`. */
  identityKey: string;
};

// Re-export SpaceId so consumers of the legacy shapes don't need a second import.
export type { SpaceId };
```

> Note: this file references the _new_ names defined in Task 1.2. Author Task 1.2 in the same commit so the module compiles.

- [ ] **Step 2: Export from the edge barrel**

In `packages/core/protocols/src/edge/index.ts`, add after `export * from './edge.ts';`:

```ts
export * from './edge-deprecated.ts';
```

### Task 1.2: Rename the client↔edge HTTP types to DID

**Files:**

- Modify: `packages/core/protocols/src/edge/edge.ts`

Apply each rename below (anchor by field/type name; line numbers are approximate). After each, the field's JSDoc should state it is the identity DID.

- [ ] **Step 1: `UploadFunctionRequest`** — replace `ownerPublicKey: string;` with:

```ts
/** Owner identity DID (`did:halo:…`). The Edge requires it to equal the authenticated presenter DID. */
ownerUri: string;
```

- [ ] **Step 2: `CreateAgentRequestBody`** — replace `identityKey: string;` with:

```ts
/** Owner identity DID (`did:halo:…`). */
identityDid: string;
```

- [ ] **Step 3: `ListActiveIdentitiesResponse`** — in the `identities[]` item, rename `identityKey: string;` → `identityDid: string;`.

- [ ] **Step 4: `InspectIdentityRequest` / `InspectIdentityResponse`** — rename `identityKey: string;` → `identityDid: string;` in both.

- [ ] **Step 5: `InspectSpaceResponse`** — in `metadata`, rename `identityKey?: string` → `identityDid?: string`; in `members.list[]`, rename `identityKey: string` → `identityDid: string`.

- [ ] **Step 6: `SpaceActivityEntry`** — in `metadata`, rename `identityKey?: string` → `identityDid?: string`.

- [ ] **Step 7: `DeleteIdentityRequest` / `DeleteIdentityResponse`** — rename `identityKey: string;` → `identityDid: string;` in both.

- [ ] **Step 8: Build `@dxos/protocols`**

Run: `moon run protocols:build`
Expected: green (Task 1.1 + 1.2 are mutually consistent).

- [ ] **Step 9: Commit**

```bash
git add packages/core/protocols/src/edge/edge.ts packages/core/protocols/src/edge/edge-deprecated.ts packages/core/protocols/src/edge/index.ts
git commit -m "feat(protocols): DID-primary edge wire types + edge-deprecated.ts (DX-1033)"
```

---

## Phase 2 — dxos consumers

### Task 2.1: `edge-http-client.ts` — uploadFunction + getAgentStatus

**Files:**

- Modify: `packages/core/mesh/edge-client/src/edge-http-client.ts`

- [ ] **Step 1: uploadFunction — read `ownerUri` from the body**

Replace the DX-995 fallback block (currently around lines 275-279):

```ts
// DX-995: the function owner is the authenticated identity (edge requires ownerUri === presenter
// DID). Send the identity DID, falling back to deriving it from the legacy hex owner key.
const ownerUri =
  this._edgeIdentity?.identityDid ?? (await createDidFromIdentityKey(PublicKey.fromHex(body.ownerPublicKey)));
formData.append('ownerUri', ownerUri);
```

with:

```ts
// The function owner is the authenticated identity (edge requires ownerUri === presenter DID).
// Prefer the connected identity's DID; otherwise use the DID supplied on the request body.
const ownerUri = this._edgeIdentity?.identityDid ?? body.ownerUri;
formData.append('ownerUri', ownerUri);
```

Then remove the now-unused imports if nothing else uses them: check `createDidFromIdentityKey` (from `@dxos/credentials`) and `PublicKey` (from `@dxos/keys`) usages in the file first:

Run: `rg -n "createDidFromIdentityKey|PublicKey\." packages/core/mesh/edge-client/src/edge-http-client.ts`

- If `createDidFromIdentityKey` has no other use, drop it from the `@dxos/credentials` import.
- `PublicKey` is still used elsewhere (e.g. `getAgentStatus`); keep it unless the grep shows otherwise. Do not introduce an unused import.

- [ ] **Step 2: getAgentStatus — accept + send a DID**

Replace the method signature + URL (currently around lines 119-128):

```ts
  public getAgentStatus(
    ctx: Context,
    request: { ownerIdentityKey: PublicKey },
    args?: EdgeHttpCallArgs,
  ): Promise<GetAgentStatusResponseBody> {
    return this._call(ctx, new URL(`/users/${request.ownerIdentityKey.toHex()}/agent/status`, this.baseUrl), {
      ...args,
      method: 'GET',
    });
  }
```

with:

```ts
  public getAgentStatus(
    ctx: Context,
    request: { ownerIdentityDid: string },
    args?: EdgeHttpCallArgs,
  ): Promise<GetAgentStatusResponseBody> {
    return this._call(ctx, new URL(`/users/${request.ownerIdentityDid}/agent/status`, this.baseUrl), {
      ...args,
      method: 'GET',
    });
  }
```

- [ ] **Step 3: Build**

Run: `moon run edge-client:build`
Expected: this will FAIL at the `edge-agent-manager` caller until Task 2.2 — that's fine; build `edge-client` itself which should pass (the caller is a different package). If `edge-client` has no internal caller, expect PASS.

### Task 2.2: `edge-agent-manager.ts` — send DIDs

**Files:**

- Modify: `packages/sdk/client-services/src/packlets/agents/edge-agent-manager.ts`

- [ ] **Step 1: createAgent — send `identityDid`**

Replace (lines ~59-63):

```ts
const response = await this._edgeHttpClient.createAgent(ctx, {
  identityKey: this._identity.identityKey.toHex(),
  haloSpaceId: this._identity.haloSpaceId,
  haloSpaceKey: this._identity.haloSpaceKey.toHex(),
});
```

with:

```ts
const response = await this._edgeHttpClient.createAgent(ctx, {
  identityDid: this._identity.did,
  haloSpaceId: this._identity.haloSpaceId,
  haloSpaceKey: this._identity.haloSpaceKey.toHex(),
});
```

- [ ] **Step 2: getAgentStatus — send `ownerIdentityDid`**

Replace (lines ~125-127):

```ts
const { agent } = await this._edgeHttpClient.getAgentStatus(ctx, {
  ownerIdentityKey: this._identity.identityKey,
});
```

with:

```ts
const { agent } = await this._edgeHttpClient.getAgentStatus(ctx, {
  ownerIdentityDid: this._identity.did,
});
```

- [ ] **Step 3: Build**

Run: `moon run client-services:build`
Expected: PASS.

### Task 2.3: plugin-script deploy producers — send `ownerUri`

**Files:**

- Modify: `packages/plugins/plugin-script/src/skills/functions/deploy.ts`
- Modify: `packages/plugins/plugin-script/src/util/deploy.ts`

- [ ] **Step 1: Locate the `ownerPublicKey` producers**

Run: `rg -n "ownerPublicKey" packages/plugins/plugin-script/src`
Expected: a `UploadFunctionRequest` literal in each file passing `ownerPublicKey: <hex>`.

- [ ] **Step 2: Replace `ownerPublicKey` with `ownerUri` (the DID)**

In each producer, the value currently passed is the identity's hex key. Replace the field with the identity DID. The surrounding code has access to the client identity; use its `.did`. Concretely, change `ownerPublicKey: identity.identityKey.toHex()` (or equivalent) to:

```ts
      ownerUri: identity.did,
```

If the local variable is not literally `identity`, use whichever identity object is in scope (grep result shows it); the DID accessor is `.did` on the client `Identity`. Do **not** introduce a hex→DID derivation in the plugin — the connected identity already exposes `.did`.

- [ ] **Step 3: Build**

Run: `moon run plugin-script:build`
Expected: PASS.

### Task 2.4: devtools CLI admin commands — dual-read `identityDid`

**Files:**

- Modify: `packages/devtools/cli/src/commands/admin/identity/list.ts`
- Modify: `packages/devtools/cli/src/commands/admin/identity/inspect.ts`
- Modify: `packages/devtools/cli/src/commands/admin/identity/delete.ts`
- Modify: `packages/devtools/cli/src/commands/admin/space/inspect.ts`
- Modify: `packages/devtools/cli/src/commands/admin/space/list.ts`

The CLI passes an identity in the URL path (now a DID) and reads the identity field from responses. Add a tiny cast-free dual-read so a new CLI still renders against a not-yet-redeployed (legacy) edge.

- [ ] **Step 1: Add a shared dual-read helper**

In `packages/devtools/cli/src/commands/admin/util.ts`, add:

```ts
import { type InspectIdentityResponse, type ListActiveIdentitiesResponse } from '@dxos/protocols';
import { type LegacyInspectIdentityResponse, type LegacyListActiveIdentitiesResponse } from '@dxos/protocols';

/** Reads the identity DID from a response item, tolerating the legacy hex `identityKey` field. */
export const readIdentityDid = (item: { identityDid: string } | { identityKey: string }): string =>
  'identityDid' in item ? item.identityDid : item.identityKey;
```

(If `@dxos/protocols` is already imported in `util.ts`, merge the named imports rather than adding a second statement. The `Legacy*` imports are only needed if you type-annotate the unions explicitly; the structural `readIdentityDid` signature above does not require them — prefer the structural signature and skip the `Legacy*` imports.)

- [ ] **Step 2: `identity/list.ts`** — type the response as the union and use the helper.

Change the import to include the legacy type and the helper:

```ts
import { type ListActiveIdentitiesResponse } from '@dxos/protocols';
import { type LegacyListActiveIdentitiesResponse } from '@dxos/protocols';

import { adminRequest, readIdentityDid } from '../util';
```

Change `adminRequest<ListActiveIdentitiesResponse>` to `adminRequest<ListActiveIdentitiesResponse | LegacyListActiveIdentitiesResponse>`, and in `formatIdentityRow` replace `identity.identityKey` with `readIdentityDid(identity)`.

- [ ] **Step 3: `identity/inspect.ts`** — `adminRequest<InspectIdentityResponse | LegacyInspectIdentityResponse>`; replace `result.identityKey` with `readIdentityDid(result)`; the `${identityKey}` in the path stays as-is (it's now a DID supplied by the user as the arg).

- [ ] **Step 4: `identity/delete.ts`** — `adminRequest<DeleteIdentityResponse | LegacyDeleteIdentityResponse>`; replace `result.identityKey` with `readIdentityDid(result)`.

- [ ] **Step 5: `space/inspect.ts`** — `adminRequest<InspectSpaceResponse | LegacyInspectSpaceResponse>`; replace `result.metadata.identityKey` with `readIdentityDid(result.metadata)` guarded by the existing `if (result.metadata.identityKey)` → `if (result.metadata && ('identityDid' in result.metadata ? result.metadata.identityDid : result.metadata.identityKey))`; for members, replace `member.identityKey` with `readIdentityDid(member)`.

- [ ] **Step 6: `space/list.ts`** — `adminRequest<ListSpacesResponse>`; `SpaceActivityEntry` metadata read: if it reads `identityKey`, swap to `readIdentityDid(space.metadata)` guarded for null.

- [ ] **Step 7: Build + lint**

Run: `moon run cli:build && moon run cli:lint`
Expected: PASS, no unused imports. (If `Legacy*` import ends up unused because the structural helper sufficed, remove it.)

- [ ] **Step 8: Commit**

```bash
git add packages/core/mesh/edge-client packages/sdk/client-services packages/plugins/plugin-script packages/devtools/cli
git commit -m "feat(edge-client,cli): send/read identityDid on edge wire (DX-1033)"
```

### Task 2.5: dxos verification

- [ ] **Step 1: Build the affected dxos graph**

Run: `moon run protocols:build edge-client:build client-services:build plugin-script:build cli:build`
Expected: all green.

- [ ] **Step 2: Cast audit (CLAUDE.md gate)**

Run: `git diff origin/main | grep -nE '\bas (any|unknown|[A-Z])|as unknown as'`
Expected: no new casts. (The `'identityDid' in x` narrowing is specifically to avoid casts.) Justify or remove any hit.

- [ ] **Step 3: Lint**

Run: `moon run :lint -- --fix` (scoped to changed packages is fine)
Expected: clean.

---

## Phase 3 — Link the dxos worktree into the edge worktree

### Task 3.1: Build dxos + link into edge (local only)

**Files:** edge worktree `package.json` + `.local-pack/` (LOCAL ONLY — reverted before the edge PR).

- [ ] **Step 1: Build the dxos packages edge will consume**

```bash
cd /Users/mykola/dev/dxos/.claude/worktrees/relaxed-haibt-e66bc7 && moon run protocols:build edge-client:build
```

Expected: green (needed because `link-packages` runs `pnpm pack`, which packs built `dist`).

- [ ] **Step 2: Link the dxos worktree into the edge worktree**

```bash
cd /Users/mykola/dev/edge/.claude/worktrees/dx-1033-finish-identitydid
node ./scripts/link-packages.mjs \
  /Users/mykola/dev/dxos/.claude/worktrees/relaxed-haibt-e66bc7 \
  --deps --transitive --install
```

Expected: packs the dxos packages edge depends on (transitively), rewrites `pnpm.overrides` to `file:.local-pack/...tgz`, runs `pnpm install --force`. The `.local-pack/` dir + `package.json`/`pnpm-lock.yaml` override changes are now dirty.

- [ ] **Step 3: Confirm the linked `@dxos/protocols` carries the new types**

```bash
cd /Users/mykola/dev/edge/.claude/worktrees/dx-1033-finish-identitydid
rg -n "ownerUri|identityDid" node_modules/@dxos/protocols/dist/**/edge*.d.ts | head
```

Expected: shows `identityDid` / `ownerUri` (the new dxos types are linked in).

- [ ] **Step 4: Verify edge still builds with the linked dxos**

```bash
cd /Users/mykola/dev/edge/.claude/worktrees/dx-1033-finish-identitydid && moon run edge-protocol:build agents:build edge:build
```

Expected: builds that import the renamed `@dxos/protocols` _response_ types (`CreateAgentResponseBody`, `GetAgentStatusResponseBody`) still pass (those weren't renamed). Edge's own duplicated request/admin types are unchanged so far — green baseline confirmed under the link.

> **Re-linking after later dxos edits:** if you change `@dxos/protocols` again during Phases 4-5, repeat Steps 1-2 (or `moon run protocols:build` then re-run `link-packages`). Avoid this by completing Phase 1-2 before linking.
>
> **NEVER commit** `.local-pack/`, the `pnpm.overrides` block, or the linked `pnpm-lock.yaml` to the edge PR (see Task 6.3).

---

## Phase 4 — Edge Tier-1: dual-accept handlers + mirror types + tests

All paths in this phase are under the edge worktree `/Users/mykola/dev/edge/.claude/worktrees/dx-1033-finish-identitydid`.

### Task 4.1: createAgent — dual-accept request schema (TDD)

**Files:**

- Modify: `packages/services/agents/src/validator.ts`
- Modify: `packages/services/agents/src/api.ts`
- Test: `packages/services/agents/test/registry.workerd.test.ts` (extend) — or the api-level test if present.

- [ ] **Step 1: Write the failing test (dual-accept)**

Add to the agents test suite (use the suite that boots the `/agents/create` route; if only the registry suite exists, add an api-level test mirroring its harness). The test asserts both a DID body and a legacy hex body decode to the same owner DID:

```ts
test('createAgent accepts identityDid and legacy identityKey (DX-1033)', ({ expect }) => {
  const hex = PublicKey.random().toHex();
  const fromDid = decodeCreateAgentRequest({
    identityDid: 'did:halo:abc',
    haloSpaceId,
    haloSpaceKey: hex,
  });
  expect(fromDid.identityDid).toEqual('did:halo:abc');

  const fromHex = decodeCreateAgentRequest({
    identityKey: hex,
    haloSpaceId,
    haloSpaceKey: hex,
  });
  expect(fromHex.identityKey).toEqual(hex);
  expect(fromHex.identityDid).toBeUndefined();
});
```

- [ ] **Step 2: Run it — expect FAIL**

Run: `moon run agents:test -- registry.workerd.test.ts`
Expected: FAIL (`identityDid` not allowed by the current schema; or `decodeCreateAgentRequest` rejects the missing `identityKey`).

- [ ] **Step 3: Make the schema dual-accept**

In `packages/services/agents/src/validator.ts`, replace `CreateAgentRequestSchema` (lines 18-22):

```ts
const CreateAgentRequestSchema = S.Struct({
  identityKey: PublicKeyHexSchema,
  haloSpaceId: SpaceIdSchema,
  haloSpaceKey: PublicKeyHexSchema,
});
```

with:

```ts
const CreateAgentRequestSchema = S.Struct({
  // DX-1033: DID is the new owner identifier; `identityKey` is the legacy hex form. Exactly one is
  // required — legacy (pre-DID) Composer clients still send `identityKey`. Normalized in the handler.
  identityDid: S.optional(S.String),
  identityKey: S.optional(PublicKeyHexSchema),
  haloSpaceId: SpaceIdSchema,
  haloSpaceKey: PublicKeyHexSchema,
}).pipe(
  S.filter((body) => body.identityDid != null || body.identityKey != null, {
    message: () => 'Either identityDid or identityKey is required.',
  }),
);
```

- [ ] **Step 4: Run the test — expect PASS**

Run: `moon run agents:test -- registry.workerd.test.ts`
Expected: PASS.

- [ ] **Step 5: Update the `/agents/create` handler to normalize**

In `packages/services/agents/src/api.ts`, replace the auth check + create block (lines ~34-47). Add the normalizer import at the top (reuse the existing one — `toIdentityDid` is exported from the registry or `packages/services/edge/src/identity.ts`; if not exported from the agents package, lift the local `toIdentityDid` in `registry.ts` to an exported util and import it here):

```ts
// DX-1033: identity may arrive as a DID (new) or hex (legacy); normalize to a DID. Auth compares
// DIDs so both forms verify against the presenter.
const requestedDid = decodedBody.identityDid ?? (await toIdentityDid(decodedBody.identityKey!));

const noAuth = getConfigFromEnv(c.env).agents?.noAuth ?? false;
const verifiedKey = c.get('verifiedIdentityKey');
const verifiedDid = verifiedKey ? await toIdentityDid(verifiedKey.toHex()) : undefined;
if (!noAuth && (!verifiedDid || verifiedDid !== requestedDid)) {
  throw new HTTPException(401, { message: 'Invalid identity.' });
}

const registry = getAgentRegistry(c.env);
const agentData = await registry.createAgent({
  haloSpaceId: decodedBody.haloSpaceId,
  identityKey: requestedDid,
  haloSpaceKey: decodedBody.haloSpaceKey,
});
```

(`registry.createAgent` already calls `toIdentityDid` on its `identityKey` arg, so passing a DID is idempotent. Optionally rename the registry arg to `ownerIdentity` for clarity — see Task 5.2.)

- [ ] **Step 6: Run agents suite**

Run: `moon run agents:test`
Expected: PASS (23/23 + new case).

### Task 4.2: getAgentStatus route — accept a DID path param

**Files:**

- Modify: `packages/services/agents/src/api.ts`

- [ ] **Step 1: Normalize the path param to a DID**

Replace the status handler body (lines ~61-77):

```ts
const ownerIdentityKey = c.req.param('identityKey')!;

const verifiedIdentityKey = c.get('verifiedIdentityKey');
if (!verifiedIdentityKey || verifiedIdentityKey.toHex() !== ownerIdentityKey) {
  throw new HTTPException(401, { message: 'Invalid identity key.' });
}

const registry = getAgentRegistry(c.env);
const status = await registry.getAgentStatusByOwnerKeys({ ownerIdentityKeys: [ownerIdentityKey] });

return EdgeResponse.success<GetAgentStatusResponseBody>({
  agent: {
    deviceKey: status[ownerIdentityKey].agentKey,
    status: mapAgentStatus(status[ownerIdentityKey].status ?? AgentStatus.NOT_FOUND),
  },
});
```

with (the param may be a DID or legacy hex; normalize both sides and key the result map by the normalized DID):

```ts
// DX-1033: the path segment is the owner identity — a DID (new) or hex (legacy). Normalize both.
const requestedDid = await toIdentityDid(c.req.param('identityKey')!);

const verifiedIdentityKey = c.get('verifiedIdentityKey');
const verifiedDid = verifiedIdentityKey ? await toIdentityDid(verifiedIdentityKey.toHex()) : undefined;
if (!verifiedDid || verifiedDid !== requestedDid) {
  throw new HTTPException(401, { message: 'Invalid identity.' });
}

const registry = getAgentRegistry(c.env);
const status = await registry.getAgentStatusByOwnerKeys({ ownerIdentityDids: [requestedDid] });

return EdgeResponse.success<GetAgentStatusResponseBody>({
  agent: {
    deviceKey: status[requestedDid].agentKey,
    status: mapAgentStatus(status[requestedDid].status ?? AgentStatus.NOT_FOUND),
  },
});
```

> The `ownerIdentityKeys` → `ownerIdentityDids` rename of `GetAgentStatusByOwnerKeysRequest` happens in Task 5.2; if you do Phase 5 after this, temporarily keep `ownerIdentityKeys: [requestedDid]` and the map key `status[requestedDid]` (the registry already normalizes), then flip the field name in Task 5.2. Keep the route's URL param name `:identityKey` (renaming a path param is cosmetic and risks missed refs).

- [ ] **Step 2: Build**

Run: `moon run agents:build`
Expected: PASS (or pending the Task 5.2 rename — see note).

### Task 4.3: functions upload — align field naming (already dual-accepts)

**Files:**

- Modify: `packages/services/functions-service/src/api.ts` (comments/naming only)

- [ ] **Step 1: Confirm dual-accept is intact**

Run: `rg -n "ownerUri|ownerPublicKey" packages/services/functions-service/src/api.ts`
Expected: the handler reads `ownerUri` and falls back to deriving from `ownerPublicKey` via `createDidFromIdentityKey` (edge#667). **No logic change needed.**

- [ ] **Step 2: Mark the legacy field deprecated**

Update the form-field schema comment so `ownerPublicKey` is annotated `@deprecated DX-1033: legacy hex owner; send ownerUri (DID).` No behavior change.

### Task 4.4: admin/data-management producers — emit `identityDid` + mirror types (TDD)

**Files:**

- Modify: `packages/sdk/edge-protocol/src/services/admin-service.ts`
- Modify: `packages/services/edge/src/data-management/data-management.ts`
- Test: `packages/services/edge/src/e2e/data-management.e2e.test.ts` (extend assertions)

- [ ] **Step 1: Rename the mirror types in `admin-service.ts`**

Apply the same field renames as dxos Task 1.2 to the duplicated types (anchor by name):

- `ListActiveIdentitiesResponse.identities[].identityKey` → `identityDid` (line ~228)
- `InspectSpaceResponse.metadata.identityKey?` → `identityDid?`; `members.list[].identityKey` → `identityDid` (lines ~242, 245)
- `InspectIdentityRequest.identityKey` / `InspectIdentityResponse.identityKey` → `identityDid` (lines ~276, 278)
- `SpaceActivityEntry.metadata.identityKey?` → `identityDid?` (line ~300)
- `DeleteIdentityRequest.identityKey` / `DeleteIdentityResponse.identityKey` → `identityDid` (lines ~316, 317)

- [ ] **Step 2: Update the producers in `data-management.ts`**

These mostly already carry a DID under a hex-named field; renaming the field is the change:

- `listIdentities` (~line 91): `identityKey: identity.identityDid` → `identityDid: identity.identityDid`.
- `inspectIdentity` (~line 309): the returned `identityKey` echoes the request; change to `identityDid: <normalized DID>` (it already computes `toIdentityDid` for the lookup — return that).
- `inspectSpace` / `_buildMembers` (~lines 122, 140-147): the member `identityKey` originates as **hex** from credentials. Derive the DID at this read boundary: for each `member`, set `identityDid: await toIdentityDid(member.identityKey)` (or `createDidFromIdentityKey(PublicKey.fromHex(member.identityKey))`). The space `metadata.identityKey` → `metadata.identityDid` (derive if it is hex; if the SpaceRegistry KV already stores a DID per DX-995 phase 6, pass through).
- `listSpaces` (~lines 460-471): `metadata.identityKey` → `metadata.identityDid` (same derivation rule as inspectSpace).
- `deleteIdentity` (~line 431): returned `identityKey` → `identityDid` (it already computes `const identityDid = await toIdentityDid(identityKey)` at ~line 394 — return that).

- [ ] **Step 3: Extend the e2e assertions**

In `data-management.e2e.test.ts`, update existing assertions that read `.identityKey` on these responses to `.identityDid`, and add an assertion that the value is a `did:halo:` string:

```ts
expect(inspectResult.identityDid.startsWith('did:halo:')).toBe(true);
```

- [ ] **Step 4: Run the edge + data-management suites**

Run: `moon run edge:test agents:test`
Expected: PASS. Re-run any data-management e2e (`moon run edge:test -- data-management`). Fix derivation mismatches at the source (don't cast).

- [ ] **Step 5: Commit (edge worktree)**

```bash
cd /Users/mykola/dev/edge/.claude/worktrees/dx-1033-finish-identitydid
git add packages/sdk/edge-protocol/src/services/admin-service.ts \
        packages/services/agents/src/validator.ts packages/services/agents/src/api.ts \
        packages/services/functions-service/src/api.ts \
        packages/services/edge/src/data-management/data-management.ts \
        packages/services/agents/test packages/services/edge/src/e2e
git commit -m "feat(edge): dual-accept + emit identityDid on client-facing routes (DX-1033)"
```

---

## Phase 5 — Edge Tier-2: edge-internal RPC rename (+ producers/consumers)

Straight rename to DID — no deprecated shapes (both ends are edge-internal, deploy atomically; values already dual-accepted via `toIdentityDid`). For each type, rename the field, then update **every producer and consumer** so names stay coherent, and keep the handler's `toIdentityDid` normalization.

### Task 5.1: router `GetConnectedDevices*`

**Files:**

- Modify: `packages/sdk/edge-protocol/src/services/router.ts`
- Modify: `packages/services/router/src/worker/entrypoint.ts`
- Modify: `packages/services/edge/src/diagnostics.ts`

- [ ] **Step 1: Rename the type**

In `router.ts` (~lines 26-39): `GetConnectedDevicesRequest.identityKeys: PublicKeyHex[]` → `identityDids: string[]`; the response map `connectedDevicesByIdentity: { [identityKey: PublicKeyHex]: ... }` → `{ [identityDid: string]: ... }`.

- [ ] **Step 2: Update handler**

In `router/src/worker/entrypoint.ts` `getConnectedDevices` (~lines 29-45): iterate `request.identityDids`; normalize each via `toIdentityDid` (already does); key the result map by the (DID) identifier.

- [ ] **Step 3: Update producer/consumer**

In `edge/src/diagnostics.ts` (`getNetworkStatus` ~line 96 + reads ~26,38,100,126): pass `{ identityDids }` (the values are already DIDs at these call sites, or normalize); read `connectedDevicesByIdentity` keyed by DID.

- [ ] **Step 4: Build**

Run: `moon run edge-protocol:build router:build edge:build`
Expected: PASS.

### Task 5.2: agents-service RPC types

**Files:**

- Modify: `packages/sdk/edge-protocol/src/services/agents-service.ts`
- Modify: `packages/services/agents/src/registry/registry.ts`, `entrypoint.ts`
- Modify: `packages/services/edge/src/data-management/data-management.ts`, `admin.ts`

- [ ] **Step 1: Rename the types (`agents-service.ts`)**
  - `GetAgentOwnerResponse.ownerIdentityKey` → `ownerIdentityDid` (~89)
  - `GetAgentKeyRequest.ownerIdentityKey` → `ownerIdentityDid` (~93)
  - `GetAgentStatusByOwnerKeysRequest.ownerIdentityKeys` → `ownerIdentityDids`; `AgentInfoByOwnerMap` key `[ownerIdentityKey]` → `[ownerIdentityDid]` (~109,113)
  - `HasRecoveryRequest.identityKey` → `identityDid` (~261)
  - `DeleteRecoveryRequest.identityKey` → `identityDid` (~289)
  - `DeleteAgentRequest.ownerIdentityKey` → `ownerIdentityDid` (~280)
  - `ListAgentSpacesRequest.ownerIdentityKey` → `ownerIdentityDid` (~297)

- [ ] **Step 2: Update handlers + producers** (each already calls `toIdentityDid` on the value; only the field name changes):
  - `registry.ts`: rename params (`getAgentKey(ownerIdentity)`, `getAgentStatusByOwnerKeys`, `deleteAgent`) callers to use the renamed request fields.
  - `agents/src/entrypoint.ts`: read the renamed fields.
  - `data-management.ts`: every RPC call constructing `{ ownerIdentityKey }` / `{ ownerIdentityKeys }` / `{ identityKey }` for these methods → the `*Did(s)` field name, passing the normalized DID (data-management already computes `toIdentityDid` for its lookups — e.g. `inspectIdentity` ~243,268,281; `deleteIdentity` ~404,425).
  - `admin.ts` `resolveIdentitySpaces` (~281): `listAgentSpaces({ ownerIdentityKey })` → `{ ownerIdentityDid }`.

- [ ] **Step 3: Reconcile with Task 4.2** — flip the `getAgentStatus` route's RPC call to `ownerIdentityDids: [requestedDid]` and map key `status[requestedDid]`.

- [ ] **Step 4: Build + agents suite**

Run: `moon run edge-protocol:build agents:build edge:build && moon run agents:test`
Expected: PASS.

### Task 5.3: admin `ResolveIdentitySpacesRequest`

**Files:**

- Modify: `packages/sdk/edge-protocol/src/services/admin-service.ts`
- Modify: `packages/services/edge/src/admin.ts`

- [ ] **Step 1:** `ResolveIdentitySpacesRequest.identityKey` → `identityDid` (~211). In `admin.ts` `resolveIdentitySpaces` (~276-286), read `request.identityDid` and pass it through (already normalized downstream).

- [ ] **Step 2: Build** — `moon run edge-protocol:build edge:build` → PASS.

### Task 5.4: data-service member identity → DID (TDD)

**Files:**

- Modify: `packages/sdk/edge-protocol/src/services/data-service.ts`
- Modify: `packages/services/db-service/src/worker/entrypoint/data-service.ts`
- Test: `packages/services/db-service/test/space-state-machine.workerd.test.ts` (or the data-service test)

Member identities originate as **hex** from credential subjects in DO storage. Keep storage hex (non-destructive); derive the DID at the read boundary.

- [ ] **Step 1: Write the failing test**

Add a case asserting `getSpaceMemberKeys` returns DIDs and `isSpaceMember` accepts a DID:

```ts
test('space members are reported as DIDs and membership accepts a DID (DX-1033)', async ({ expect }) => {
  // ...seed a space with a member whose credential subject is `memberHex`...
  const dids = await dataService.getSpaceMemberKeys(ctx, spaceId);
  expect(dids.every((d) => d.startsWith('did:halo:'))).toBe(true);
  const expectedDid = await createDidFromIdentityKey(PublicKey.fromHex(memberHex));
  expect(await dataService.isSpaceMember(ctx, spaceId, expectedDid)).toBe(true);
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `moon run db-service:test -- space-state-machine`
Expected: FAIL (returns hex; `isSpaceMember` compares hex).

- [ ] **Step 3: Update the type + handler**

In `data-service.ts`: `isSpaceMember(identityKey: string)` arg → `identityDid: string`; `getSpaceMemberKeys(): string[]` return documented as DIDs.

In `db-service/.../data-service.ts`:

- `getSpaceMemberKeys` (~228): map members → `await Promise.all(result.members.map((m) => toIdentityDid(m.identityKey)))` (members keep their hex `identityKey` internally; derive DID on output). Use `createDidFromIdentityKey(PublicKey.fromHex(...))` if no local `toIdentityDid`.
- `isSpaceMember` (~219): normalize the arg and compare against derived member DIDs: `const targetDid = await toIdentityDid(identityDid); const memberDids = await getSpaceMemberKeys(...); return memberDids.includes(targetDid);` (or normalize the stored hex member and compare). Do not change the persisted hex.

- [ ] **Step 4: Update the producer (auth)**

In `packages/services/edge/src/data-management/api.ts`, the membership/auth check that calls `isSpaceMember(..., <identity>)` now passes a DID (the verified presenter DID). Grep: `rg -n "isSpaceMember" packages/services/edge/src` and pass `userIdentity`/`verifiedIdentityDid` (DID) instead of the hex key.

- [ ] **Step 5: Run — expect PASS**

Run: `moon run db-service:test -- space-state-machine && moon run edge:test`
Expected: PASS.

- [ ] **Step 6: Commit (edge worktree)**

```bash
git add packages/sdk/edge-protocol packages/services/router packages/services/agents \
        packages/services/edge packages/services/db-service
git commit -m "refactor(edge): rename internal RPC identity fields to identityDid (DX-1033)"
```

---

## Phase 6 — Integration, de-link, PRs

### Task 6.1: dxos full verification

- [ ] **Step 1:** `cd /Users/mykola/dev/dxos/.claude/worktrees/relaxed-haibt-e66bc7`
- [ ] **Step 2:** `MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism` for the changed packages (`protocols`, `edge-client`, `client-services`, `plugin-script`, `cli`). Expected: green.
- [ ] **Step 3:** `moon run :lint -- --fix` and `pnpm format`. Expected: clean.
- [ ] **Step 4:** cast audit (Phase 2 Task 2.5 Step 2) over the full dxos diff. Expected: none.

### Task 6.2: edge full verification (still linked)

- [ ] **Step 1:** `cd /Users/mykola/dev/edge/.claude/worktrees/dx-1033-finish-identitydid`
- [ ] **Step 2:** run the edge suites touched: `moon run edge-protocol:build agents:test edge:test db-service:test router:build functions-service:build`. Expected: green (modulo the known `triggers-dispatcher` flake noted in Phase 0).
- [ ] **Step 3:** lint/format per the edge repo's tasks.

### Task 6.3: De-link edge + bump to published dxos

> The edge PR must depend on a **published** `@dxos/*` (pkg.pr.new), never the local `.local-pack`.

- [ ] **Step 1: Publish the dxos branch** (pkg.pr.new is produced by CI on push; push the dxos branch first — see Task 6.4 — and note the published version/sha).

- [ ] **Step 2: Drop the local link**

```bash
cd /Users/mykola/dev/edge/.claude/worktrees/dx-1033-finish-identitydid
git checkout package.json pnpm-lock.yaml
rm -rf .local-pack
```

- [ ] **Step 3: Bump `@dxos/*` to the published version**

Set the `@dxos/protocols` (+ any other changed `@dxos/*`) version in the edge worktree to the pkg.pr.new build for the dxos branch, then:

```bash
CI=true HUSKY=0 pnpm install
```

- [ ] **Step 4: Verify a clean lockfile (no `file:` refs)**

```bash
rg -n "\.local-pack|file:" package.json pnpm-lock.yaml | head
```

Expected: **no** `.local-pack`/`file:` refs to dxos packages.

- [ ] **Step 5: Re-run edge builds/tests against published deps** (repeat Task 6.2). Expected: green.

### Task 6.4: PRs

- [ ] **Step 1: dxos PR** (from this worktree, branch `claude/relaxed-haibt-e66bc7`):
  - `git status` clean except intended files; push.
  - `gh pr create --title "feat(protocols,edge-client): finish identityDid wire-type migration (DX-1033)" --body "<summary>"` — body: closes DX-1033; describe expand/defer-contract, the `edge-deprecated.ts` back-compat, link the edge PR.
  - Monitor: `gh run list --branch claude/relaxed-haibt-e66bc7 --limit 5 --workflow "Check"`.

- [ ] **Step 2: edge PR** (from the edge worktree, branch `claude/dx-1033-finish-identitydid`):
  - confirm de-link (Task 6.3 Step 4); `git status` clean; push.
  - open the edge PR; body references the dxos PR + the pkg.pr.new version it bumped to; closes DX-1033 (or "part of").
  - monitor edge CI.

- [ ] **Step 3: Cross-link** both PR descriptions and surface the Composer preview URL for the dxos PR per CLAUDE.md (fetch the sticky `composer-preview` comment).

---

## Out of scope (do NOT do)

- Dropping the deprecated types / legacy fields (phase 7, gated on Composer redeploy + telemetry).
- Category-B signer fields (`JoinSpaceRequest`, `RecoverIdentity*`, device/agent/peer/feed/space keys).
- The staging/labs **deploy** ops (`0009`, `haloSpace:` KV cleanup) — operational, never run from this work.
- The cross-repo `PeerData`/`AuthState.identityKey` swarm-advertising holdout (needs a `@dxos/messaging` change).
- Re-keying persisted DO/credential storage to DID — derive at the read boundary only; storage stays hex.

---

## Self-review

**Spec coverage (vs the back-compat model + audit category A):**

- UploadFunctionRequest `ownerUri` — Tasks 1.2, 2.1, 2.3, 4.3 ✓
- CreateAgentRequestBody `identityDid` — Tasks 1.2, 2.2, 4.1 ✓
- getAgentStatus DID path — Tasks 2.1/2.2, 4.2 ✓
- ListActiveIdentities / InspectIdentity / InspectSpace / SpaceActivity / DeleteIdentity — Tasks 1.2, 1.1 (legacy), 2.4 (CLI), 4.4 (edge) ✓
- Tier-2 router / agents-service / admin resolve / data-service members — Tasks 5.1–5.4 ✓
- Deprecated types preserved + `@deprecated` — Task 1.1 ✓
- Edge dual-accept (requests) — Tasks 4.1, 4.2, 4.3 ✓
- CLI dual-read (responses) — Task 2.4 ✓
- Worktree + linking + de-link-before-PR — Tasks 0.1, 3.1, 6.3 ✓

**Placeholder scan:** code blocks are concrete; the few "grep then apply the uniform rename" steps (Tasks 2.3, 5.x) name the exact files + field transformation + verification command — the indirection is to avoid copying 15 near-identical blocks, not a TBD. No "add error handling"/"TODO" left.

**Type consistency:** new names used uniformly — `identityDid` (identity), `ownerIdentityDid` (agent owner), `ownerIdentityDids` (plural arg), `ownerUri` (function owner), `readIdentityDid` (CLI helper), `toIdentityDid` (edge normalizer). The Task 4.2 ↔ 5.2 ordering dependency on `ownerIdentityDids` is called out explicitly in both tasks.

# Agent Firewall: Layered Cross-Space Access for AI Sessions

> Status: Draft / design proposal. Companion to [remote-agents.md](./remote-agents.md) and [halo-spec.md](./halo-spec.md).

## Overview

We want to expose the whole hypergraph (all of a user's spaces) to AI sessions, while keeping the
access-control boundaries between spaces unambiguous. The chosen structure is a **layered, downward-only
trust firewall** over agents:

- A **space-resident agent** (T0) has access to **exactly one space** — the space it was spawned in. This
  is safe precisely because that one space's contents are exactly what every member of that space already
  shares. The agent has no knowledge of, and no handle to, any other space, so it cannot widen its own
  blast radius.
- The user's **personal-space agent** (T1) is the privileged **orchestrator**: it can **read across all the
  user's spaces** and **delegate down** to space-resident agents. This is safe because its broad reach is
  exactly the union of what the user is already entitled to as a member of those spaces — it acts as the
  user, never more.

Trust flows **downward only** (personal → space). A T0 agent has a single outward delegation edge that
points *within its own space*; it can never reach up into T1's authority or sideways into another space.

This document maps the model to prior art (Dreamer; the capability-security literature), states the
invariants that must hold, explains why the naive enforcement point is insufficient, identifies the real
enforcement seams in the code, and lays out a phased implementation plan.

## Prior art

### Dreamer (David Singleton's "Personal Agent OS")

Dreamer models a personal-agent platform as an operating system:

- The **Sidekick** is the *kernel* — the single trusted component with access to all of the user's tools,
  all of the user's agents, and the user's full memory. It acts with the user's aggregate authority and is
  the only point of cross-scope visibility.
- User-built **agents/agentic apps** are *user-space processes* — each sandboxed in its own isolated VM with
  an auto-provisioned database and default row-level scoping ("when you query the database, you're gonna get
  the stuff that is for you… unless the builder said this is public").
- Cross-agent work is strictly **hub-and-spoke through the Sidekick**: *"when one agent wants to work with
  another… it does it via the sidekick."* The "Functions" abstraction surfaces every agent to the Sidekick
  as just another tool; memory is Sidekick-filtered so an agent receives "only the data they specifically
  need to function."

The DXOS model is a near-exact analogue:

| DXOS tier | Dreamer analogue | Trust invariant |
| --- | --- | --- |
| **T1 — personal-space orchestrator** | Sidekick (kernel) | Broad reach = the union of what the user is already entitled to. Only tier with allowlist > 1. |
| **T0 — space-resident agent** (private or shared) | user-space agent / agentic app | One space's contents = exactly what every member already shares. Allowlist is the immutable singleton `[spawnSpaceId]`. |
| tool / operation layer | tool / integration layer | Credentials & permission decisions live in the trusted layer, not scattered across agents. |

**Key substitution.** Dreamer's hard wall is a **per-user VM** — cross-user reach is *physically*
impossible. DXOS has no VM; its boundary is the **space ACL plus client-side scope materialization**. As the
[enforcement](#why-the-naive-enforcement-point-is-insufficient) section shows, that difference is the entire
crux of the problem: because all of a user's member spaces are already replicated into one in-process
hypergraph, the firewall must be enforced in deterministic client-side code at the resolver/query layer, not
assumed from the ACL.

A private-space and a shared-space agent are the **same tier** (T0). The shared-vs-private distinction is a
visibility/policy attribute that rides on the space (and later feeds role-derived writability), not a
separate firewall layer.

### Capability-security principles

The design is a direct application of object-capability and least-authority principles:

- **POLA / least authority.** A child agent is provisioned from zero and granted only the minimal capability
  its delegated task requires — never the union of its caller's authority.
- **Object-capability: designation == authority, no ambient authority.** An agent acts only via explicit
  capability handles passed to it (one space, one document, one tool). It has no ambient "I am the personal
  agent" authority floating in the environment to be tricked into exercising. Ambient authority is exactly
  what produces the confused deputy.
- **Monotonic attenuation on delegation.** `authority(child) ⊆ authority(parent)` on every hop. The child
  scope is computed as `requested ∩ policy ∩ delegator's own authority`. The child physically cannot widen,
  because it never holds the un-attenuated parent capability.
- **Zero-trust inter-agent verification.** A callee authorizes against the *capability actually presented for
  the target scope*, never against who relayed the request. This severs upward amplification: a narrow agent
  cannot launder a request through the broad orchestrator to gain broad authority.
- **Deterministic, code-enforced boundaries.** The model may *request* a delegation; the harness *computes*
  the attenuated capability. Attenuation is never left to the LLM to self-limit.

## The tier model

### T0 — space-resident agent

- **Scope:** exactly one space, fixed at spawn from the feed EID
  ([AgentService.ts:156](../../packages/core/compute/functions-runtime/src/agent-service/AgentService.ts))
  or the app-layer `ServiceResolver.provide({ space })`
  ([useChatProcessor.ts:82](../../packages/plugins/plugin-assistant/src/hooks/useChatProcessor.ts)).
  Allowlist = the singleton `[spawnSpaceId]`.
- **Reads (R2+R3):** `listSpaces` returns exactly `[this space]`; `query` runs with `Scope.space({ id })`
  only. R2+R3 degenerate to a single-element scope, so cross-space read is structurally impossible.
- **Writes (W1):** read-write confined to its one space via
  [DatabaseLayerSpec](../../packages/plugins/plugin-client/src/capabilities/layer-specs.ts).
- **Delegates to:** sub-agents and tools **within its own space only** (allowlist ⊆ `[spawnSpaceId]`). Never
  upward, never sideways.
- **Trust:** safe because the one space is exactly what every member already shares; the agent has no handle
  to name another space.

### T1 — personal-space orchestrator

- **Identity / placement:** the personal space is an **app-level** concept
  ([AppSpace.ts](../../packages/sdk/app-toolkit/src/echo/AppSpace.ts), tag
  `org.dxos.space.personal`), so the orchestrator is provisioned at the app layer (Composer/CLI), not the
  SDK. (See `project_personal_space_architecture` memory.)
- **Read scope:** the **brane** — every space the user is a member of, enumerated via the Hypergraph /
  membership directory (not `Client.spaces` as an authority source — that is the access-control API; see
  `feedback_hypergraph_over_space_api` memory). The allowlist is **derived**, not free-form: `membership ∩
  app-allowlist`, materialized into explicit per-space `Scope.space({ id })` targets.
- **Write scope (now):** personal/home space only (W1). Broad read does **not** imply broad write.
- **Delegates to:** **downward** to T0 agents in any space in its read allowlist, and to tools. Delegation is
  attenuating — it hands down a single-space capability `[targetSpaceId]`, never its own brane-wide handle.
- **Trust:** safe because its breadth equals the user's own membership. It must never relay a narrow agent's
  request under this broad authority (confused-deputy rule).

## Firewall invariants

1. **Single-space confinement (T0).** A space-resident agent's allowlist is exactly `[spawnSpaceId]`, a
   singleton, immutable for the life of the process. It cannot be enlarged by the agent, by ingested
   untrusted content (prompt injection), or by any sub-call.
2. **Derived, not free-form, allowlist.** The allowlist is a function of **tier**, not of the session. T0 ⇒
   `[spawnSpaceId]`; T1 ⇒ `SpaceAccess(membership ∩ app-allowlist)`. The `SpaceAccess` control-plane service
   is the single seam every read/write/delegation consults.
3. **Monotonic attenuation on delegation.** For every hop, `allowlist(child) ⊆ allowlist(parent)`. The
   harness computes `child = requested ∩ policy ∩ parent`; the model may only *request*, never decide scope.
4. **No ambient widening via inheritance.** The spawn chokepoint must **stamp** an explicit allowlist and
   re-validate against the parent. Inheritance may carry only equal-or-narrower scope; absence of an
   allowlist means *deny*, never *inherit broader*.
5. **Materialized scopes only — never "all".** Every cross-space read executes against an explicit set of
   `Scope.space({ id })` targets derived from the allowlist. The token `'all-accessible-spaces'` must never
   reach a query.
6. **Space-qualified results always.** Every read result carries its absolute URI (`echo://<spaceId>/<id>`),
   regardless of tier, so provenance is unambiguous.
7. **Downward-only authority flow.** Trust flows T1 → T0 only. A T0 agent has no edge to T1 or to another
   space; T1 reaches down but never borrows a T0 agent's narrowness to escape.
8. **No confused-deputy relay.** T1 must not execute a broad action "on behalf of" a T0 agent using T1's
   aggregate authority. Any request crossing the firewall is authorized against the capability presented for
   the target scope, not against who relayed it.
9. **Writes stay home (W1).** For all tiers today, writes are confined to the session/home space's
   `Database.Service`. Reading broadly (T1) never implies writing broadly. Cross-space writes (W2/W3) are
   future work behind `SpaceAccess`.
10. **Enforcement is structural, not advisory.** The boundary is enforced in deterministic code at the
    resolver/query/spawn chokepoints — not by trusting the LLM to self-limit. (See the next section for why
    the ACL alone is insufficient.)

## Why the naive enforcement point is insufficient

The intuitive design enforces the firewall at the operation / `SpaceAccess` / allowlist layer, with
Subduction as a replication-layer backstop. **An adversarial review showed this is bypassable**, and the
reasons reshape where enforcement must live.

**All of a user's member spaces are already replicated into one shared in-process `Hypergraph`**
(`_databases` map, [hypergraph.ts](../../packages/core/echo/echo-client/src/hypergraph.ts)). So "the space
ACL is the boundary" is false for an in-process agent — the data is already local. The bypass paths:

1. **Ref resolution routes by the URI's own embedded `spaceId`.** `#routeBackend`
   ([hypergraph.ts:256](../../packages/core/echo/echo-client/src/hypergraph.ts)) and the synchronous
   `_resolveSync` ([hypergraph.ts:496](../../packages/core/echo/echo-client/src/hypergraph.ts)) take the
   `spaceId` from a fully-qualified `echo://<otherSpace>/<id>` URI and fetch that db directly — **no allowlist
   check**. A foreign URI carried in untrusted data is a working handle.
2. **Query fan-out honors model-supplied scopes.** `db.query()` routes through the shared hypergraph; an
   explicit `Scope.space({ id: B })` reaches `_isValidSourceForQuery`
   ([graph-query-context.ts:387](../../packages/core/echo/echo-client/src/query/graph-query-context.ts)),
   which checks the query's *declared* scope, not an allowlist. `bindOwningSpaceScopes` only fills *missing*
   ids, so an explicit foreign id passes through and fans out.
3. **`DatabaseLayerSpec` authorizes by existence, not permission.**
   [layer-specs.ts:67](../../packages/plugins/plugin-client/src/capabilities/layer-specs.ts) does
   `client.spaces.get(context.space)`, which succeeds for any space the user is a member of, returning a
   fully **writable** db with only an `invariant(space)` existence check.
4. **Subduction (P3) does not backstop in-process reads.** `authorizeFetch` gates the *outbound wire* to
   remote peers; an in-process `db.getObjectById` against an already-replicated local db never touches it. P3
   is only load-bearing for **headless/remote** space-agent devices.
5. **The spawn chokepoint merges, it does not intersect.** `ProcessManager.spawn` computes `environment =
   { ...parentHandle.environment, ...options.environment }`
   ([ProcessManager.ts:415](../../packages/core/compute-runtime/src/ProcessManager.ts)). A child inherits the
   parent's space by omission and can *override* with no subset check — so a future T1 parent would leak its
   brane scope down to a T0 child.

**Consequence.** `SpaceAccess` + the allowlist is necessary scaffolding but **enforces nothing on its own**.
Real confinement happens only when the allowlist is threaded into the **Hypergraph resolver context and the
query fan-out** — one chokepoint that gates `Ref.target` / `Ref.load` and `db.query` alike — plus an
**intersecting** spawn chokepoint. Prompt injection is the trigger: a malicious document in a space a T0
agent legitimately reads can hand it a foreign URI or a foreign query scope, and today both resolve.

## Verified gaps that exist today

Two findings are confirmed bugs in the current code, independent of any agent-firewall work — they affect
the existing single-space assistant too:

1. **Synchronous cross-space ref resolution.** `_resolveSync`
   ([hypergraph.ts:496](../../packages/core/echo/echo-client/src/hypergraph.ts)) resolves any
   `echo://<otherSpace>/<id>` URI with no guard, while the async sibling `_resolveAsync`
   ([hypergraph.ts:547](../../packages/core/echo/echo-client/src/hypergraph.ts)) explicitly throws
   `'Cross-space references are not yet supported'`. Since `Ref.target` (the synchronous reactive accessor
   used throughout agent and React code) takes the sync path, cross-space resolution silently works where the
   async contract forbids it.
2. **Shared-space credential leak.** `credentialsLayerFromDatabase`
   ([credentials.ts:86](../../packages/core/compute/functions/src/services/credentials.ts)) does
   `dbService.db.query(Query.type(AccessToken.AccessToken)).run()`, returning **every** member's API tokens
   from a shared space's db. The T0 trust invariant ("exactly what every member already shares") is wrong for
   secrets: replication scope is not authorization scope.

## Enforcement architecture

The control plane is a single service, **`SpaceAccess`**, that — given a tier, a requested space, and the
user's membership — returns the materialized readable allowlist (and, later, the writable set). It is
consulted at the spawn chokepoint and at the resolution chokepoints. The personal-space / app-allowlist
inputs are injected from the app layer (Composer/CLI) so the SDK does not reach upward into app concepts.

The seams (each grounded in code):

| Seam | File | Role |
| --- | --- | --- |
| Spawn chokepoint | [ProcessManager.ts:415](../../packages/core/compute-runtime/src/ProcessManager.ts) | Stamp + intersect the allowlist; fail-closed on non-subset. |
| Space→db resolution | [layer-specs.ts:67](../../packages/plugins/plugin-client/src/capabilities/layer-specs.ts) | Deny when `context.space ∉ allowlist`; later return a read-only proxy for read-only tiers. |
| Ref resolution | [hypergraph.ts:256](../../packages/core/echo/echo-client/src/hypergraph.ts) (`#routeBackend`), `_resolveSync`/`_resolveAsync` | Reject a URI whose `spaceId ∉ allowlist`; unify sync/async so they cannot diverge. |
| Query fan-out | [graph-query-context.ts:387](../../packages/core/echo/echo-client/src/query/graph-query-context.ts) | Intersect the query's target spaces with the allowlist; reject foreign scopes. |
| Ref-resolver context | [Database.ts:282](../../packages/core/echo/echo/src/Database.ts) | Carry the allowlist (not just `db.spaceId`) into `createRefResolver`. |
| Operation re-target | [Operation.ts:454](../../packages/core/compute/compute/src/Operation.ts), [ProcessOperationInvoker.ts:195](../../packages/core/compute-runtime/src/ProcessOperationInvoker.ts) | Validate `InvokeOptions.spaceId` against the caller's allowlist; intersect rather than override. |
| Hard guard | [registry.ts:240](../../packages/core/compute/conductor/src/nodes/registry.ts) | Generalize the tautological `invariant(db.spaceId === spaceId)` into an allowlist-membership check. |
| Principal / audit | [ServiceResolver.ts:65](../../packages/core/compute/compute/src/ServiceResolver.ts) (`identity`, unused), [LayerStack.ts:104](../../packages/core/compute-runtime/src/LayerStack.ts) | Thread a scoped agent-principal; partition cached slices by principal. |

> Note: `ResolutionContext.identity` exists but is unused; `ProcessManager` populates only
> `{ space, conversation, process }`. Today an agent acts entirely as the hosting user's HALO identity/device
> — there is no per-agent principal, so audit cannot answer "who invoked whom" and clean per-agent revocation
> is impossible.

### Implemented read-scope seam (Phase 2, partial)

The read-confinement seam is a dedicated **`Hypergraph.Service`** carrying the session's read
**allowlist** (the policy), rather than threading scope through `Database.Service`. Resolution and
queries are confined differently, to preserve `db.query` semantics:

- **`Hypergraph.Service`** ([Hypergraph.ts](../../packages/core/echo/echo/src/Hypergraph.ts)) is an
  optional Effect service carrying `allowlist: readonly SpaceId[]`. `Database.resolve` /
  `Database.query` ([Database.ts](../../packages/core/echo/echo/src/Database.ts)) consult it via
  `Effect.serviceOption` (so it adds nothing to their `R` channel and every existing caller is
  unaffected); absent ⇒ unconfined. `Hypergraph.scopedLayer(allowlist)` installs it.
- **Resolution** runs against a `scoped` view of the home graph: `db.graph.scoped([...allowlist])`.
  **`ScopedHypergraph`** ([hypergraph.ts](../../packages/core/echo/echo-client/src/hypergraph.ts)) is a
  narrow-only view of the in-process `HypergraphImpl` — `getDatabase` returns `undefined` outside the
  set, synchronous ref resolution misses a foreign `spaceId`, and `graph.scoped(a).scoped(b) = a ∩ b`
  (never widens). The confinement is **structural**: foreign spaces are simply absent from the view.
- **Queries route by allowlist shape.** `db.query` binds an unscoped selection to the owning space and
  special-cases feed/queue selections — semantics a raw hypergraph fan-out (`graph.query`) does not
  reproduce. So a **single-home** session keeps `db.query` unchanged (already home-confined). A query
  that explicitly selects a space **outside** the allowlist, or any query from a session whose
  allowlist **spans more than the home space**, is routed through `db.graph.scoped(allowlist).query`:
  a foreign scope finds no source (denied → empty), and a multi-space allowlist fans the read out
  across every allowed space (`db.query` alone would see only the home space). This both denies the T0
  leak (a model-supplied foreign `Scope.space`) and provides the T1 multi-space read.
- **Wiring.** The app layer
  ([useChatProcessor.ts](../../packages/plugins/plugin-assistant/src/hooks/useChatProcessor.ts)) and the
  headless agent process
  ([agent-process.ts](../../packages/core/compute/functions-runtime/src/agent-service/agent-process.ts))
  each provide `Hypergraph.scopedLayer([spaceId])` into the session runtime *and* the tool execution
  layer, alongside an unscoped home `Database.Service`.

**Why a separate service, not a field on `Database.Service`.** Read-scope is per-session / per-principal
with process-affinity lifetime; the home `Database.Service` is per-space, **shared and cached** by the
`LayerStack` (space slice keyed by `{ space }`, `keepAlive` — [LayerStack.ts](../../packages/core/compute/compute-runtime/src/LayerStack.ts)).
Confinement therefore cannot live in the space slice and must be injected at process affinity. Keeping it
on a distinct service (a) leaves `Database.Service` — the write/home authority — untouched, so invariant
#9 (writes stay home) holds **by construction**; (b) lets the read scope diverge from the home space,
which is exactly the T1 case (read = brane, write = personal space); and (c) is fail-closeable at the
agent boundary (a missing scope is a missing service, not silently unconfined). This covers the
table's *Ref resolution*, *Query fan-out* and *Ref-resolver context* rows for the in-process read path;
the *Space→db resolution* (`DatabaseLayerSpec`), *Spawn chokepoint*, *Operation re-target*, *Hard guard*
and *Principal* rows remain future work (Phases 3–4).

> **T1 status.** Multi-space *reads* work: a session whose allowlist spans several spaces fans out
> across all of them via the scoped graph — for **objects** (working-set) and **full-text/index**
> (one scope-aware index source per allowed space, since the host does single-space full-text only).
> Tested: `Database.query` over `scopedLayer([A, B])` returns both objects and full-text matches from
> both spaces; `scopedLayer([A])` stays confined to A. Two pieces remain for full T1: (1) a *source*
> of multi-space allowlists — the personal-space orchestrator (app-level) deriving the allowlist from
> membership; today every agent is stamped `[homeSpace]` (T0), per invariant #1. (2) feed/queue
> handling on the scoped fan-out — `db.query`'s `_queryFeed` path is not yet reproduced there, so a
> feed/queue-scoped query against a non-home allowed space is not served.

> Testing: confinement is unit-tested in
> [hypergraph.test.ts](../../packages/core/echo/echo-client/src/hypergraph.test.ts) (scoped `getDatabase`,
> query fan-out, foreign-scope denial, sync resolution, `Database.query` confinement via
> `Hypergraph.scopedLayer`, narrow-only intersection). Because confined T0 queries keep `db.query`,
> the existing memoized agent suites (assistant-toolkit, functions-runtime) pass unchanged — no
> fixture regeneration. A full agent-turn cross-space-denial e2e test needs a multi-space memoized
> fixture (`ALLOW_LLM_GENERATION=1`) and is pending.

## Delegation protocol (T1 → T0)

Today agent-to-agent delegation exists but is **intra-space only**: the supervisor spawns a sub-agent via
`invokeFiber(AgentPrompt, …)` with **no environment**, so the child inherits the supervisor's space
([delegation-strategy.ts:130](../../packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts)),
and results fold back by appending a `Message` to the **same** conversation feed
([delegation-strategy.ts:193](../../packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts)).
There is no cross-space agent messaging.

The target protocol is a **task-in / result-out** call, never a credential/identity handoff:

1. T1 picks a target space `S` (within its read allowlist) and a task. It does **not** pass its brane-wide
   allowlist down.
2. T1 spawns the T0 agent's session in `S` with an **explicit** environment whose `allowlist = [S]`. At the
   `ProcessManager.spawn` chokepoint the firewall stamps `[S]`, **overriding** (not unioning) any broader
   inherited scope. `DatabaseLayerSpec` then binds `Database.Service` to `S` alone — the child never receives
   a handle it could use to name another space (designation == authority).
3. The T0 agent runs entirely within `S`: `listSpaces = [S]`, `query` uses `Scope.space({ id: S })`, writes
   hit `S`'s db. It holds no reference to T1's authority.
4. Results flow back **up as data, not authority**: the T0 agent appends space-qualified results (`echo://S/…`)
   to its conversation feed; T1 folds them into its own (personal-space) context. The act of folding is a T1
   read into its own allowlist — it does not retroactively grant T0 anything.

**Boundary preservation.** (a) Attenuation by override — T1 hands down `[S]`, never its brane allowlist.
(b) No credential passing — only a task description and a single-space capability cross the boundary. (c)
Zero-trust on return — T1 treats T0 output as untrusted input (indirect-prompt-injection filtering) and never
executes a privileged cross-space action because T0 "asked." (d) **Re-attenuation on forwarding** — before T1
re-delegates, it strips/rejects any space-qualified URI whose origin space ∉ the target's `[S]`, so the
shared conversation feed cannot become a covert channel that launders data between two T0 spaces through T1.

## Implementation plan

The phases evolve the prior decisions — **R2+R3** reads, **W1** writes, **P1** allowlist, and the
`SpaceAccess` seam — rather than restarting them. They map onto the R/W/P ladder:

| Phase | What it does | Ladder | Risk |
| --- | --- | --- | --- |
| **1 — `SpaceAccess` seam + tier-derived allowlist** | Add `allowlist`/`tier`/`identity` to `Environment` + `ResolutionContext`; `SpaceAccess` computes the allowlist from tier × membership. Observe-only; default = today's scope. | reframes **P1** (tier *determines* allowlist) | low |
| **2 — Close in-process read holes** ⭐ | Confine reads via a scoped Hypergraph view + `Hypergraph.Service` (resolver + query fan-out), wired into the app and headless agent sessions. **Confinement becomes structural here.** *(Done; see [Implemented read-scope seam](#implemented-read-scope-seam-phase-2-partial). Remaining: unify `_resolveSync`/`_resolveAsync`, scope-aware index provider, flip `DatabaseLayerSpec`.)* | **R2+R3** become real | **highest** — on every read path |
| **3 — Attenuating spawn** | `ProcessManager.spawn` intersects (not merges); validate `Operation.invoke({ spaceId })`; require a fully-qualified feed EID. | delegation attenuation | medium |
| **4 — Hard guard + principal + revocation** | Generalize the conductor invariant; mint a scoped agent-principal; re-validate membership on resolution. | enables **P2**, audit | high (LayerStack caching) |
| **5 — Credential confinement** | Stop shared-space `AccessToken` harvesting; scope credentials to the owning principal or HALO. | fixes verified gap #2 | medium |
| **6 — Attenuating T1 → T0 delegation** | Reuse the existing spawn + feed channel; build re-attenuation of forwarded URIs + provenance tagging. | the delegation protocol; **W2/W3** attach point | medium |
| **7 — Subduction (P3) for remote agents** | `authorizeFetch` gates which spaces a *headless* agent device replicates. Inert for in-app; mandatory for remote. | **P3**, correctly scoped | high (replication) |

Phase 1 ships zero behavior change. Phase 2 is the load-bearing phase and carries the most blast radius — it
touches core ECHO ref/query resolution, so the default `allowlist = [space]` (when unset) must preserve all
non-agent UI behavior.

## Open decisions

1. **Agent principal vs. "acts as the user."** Mint a distinct scoped agent-principal (threaded through
   `Environment.identity` → `ResolutionContext.identity`, with `LayerStack` slices partitioned by principal),
   or keep "agent appears as the user" and rely solely on scope materialization? A scoped principal
   contradicts the current model and needs a credential/revocation story; without it, audit, zero-trust
   verification, and clean per-agent revocation are not fully enforceable. Flagged undecided in
   [remote-agents.md:65](./remote-agents.md).
2. **Defense-in-depth depth.** Is the Phase-2 client-side resolver/query gate sufficient, or do we also
   commit to the Phase-4 hard guard and Phase-7 Subduction? Note `authorizePut` is intentionally allow-all
   (invitation-bootstrapping deadlock), so inbound *write* gating is unsolved regardless — which bounds how
   much W2/W3 can rest on Subduction.
3. **`SpaceAccess` placement.** Proposed in `@dxos/functions`, consuming an app-injected provider capability
   so the SDK does not invert the app-level personal-space layering. Confirm this direction.
4. **Brane enumeration source for T1.** Materialize the per-space scope set from the Hypergraph
   membership/role directory from day one, or bottom out in `Client.spaces` as interim tech-debt (migrating
   in Phase 4)? Requires confirming a Hypergraph membership/role read path exists.
5. **Shared-space write policy timing (P2).** A shared-space T0 agent writing under a `READER`-role user is
   wrong even under W1. Add a minimal role check now for shared spaces, or rely on the home-space-only W1
   default plus a single-member personal-space assertion?
6. **Revocation propagation to in-flight delegations.** On membership loss or allowlist shrink mid-session,
   hard-terminate dependent T0 delegates and in-flight sub-agents, or let them drain?
7. **T1 aggregate-index containment (universal search).** A T1-held aggregate index across all spaces is a
   legitimate T1 read, but re-embedding it into a single-space T0 prompt re-introduces cross-space data.
   Forbid re-embedding an aggregate into a T0 prompt, or require per-space re-derivation?

## References

- DXOS: [remote-agents.md](./remote-agents.md), [halo-spec.md](./halo-spec.md).
- Dreamer — the Personal Agent OS (David Singleton): <https://www.latent.space/p/dreamer>.
- Microsoft, "Defense in depth for autonomous AI agents":
  <https://www.microsoft.com/en-us/security/blog/2026/05/14/defense-in-depth-autonomous-ai-agents/>.
- Microsoft Entra Agent ID best practices:
  <https://learn.microsoft.com/en-us/entra/agent-id/best-practices-agent-id>.
- "AC4A: Access Control for Agents": <https://arxiv.org/abs/2603.20933>.
- "Security of AI Agents": <https://arxiv.org/abs/2406.08689>.
- Hardy / Habitat Chronicles, "What are capabilities?":
  <http://habitatchronicles.com/2017/05/what-are-capabilities/>.

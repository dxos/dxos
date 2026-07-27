# Agent identity for authored content (suggestions, comments, edits)

Status: design. Decision (2026-07-21): **synthetic DIDs today**, plan for real identities +
multiple agents.

## Problem

When an agent authors reviewable content — today a `kind:'suggestion'` branch via
`Branch.suggestion(doc, parent, creator)` — it needs a stable author identity (`creator`):

- **Stable** — the same agent maps to the same suggestion branch (idempotent) and the same colour.
- **Distinct per agent** — multiple agents in a space must be separable authors.
- **Not LLM-supplied** — the `creator` DID must be injected by the runtime; an LLM cannot know a
  DID, so it must never appear as a tool input the model fills.

Today there is no agent→DID binding. `SuggestEdit` takes `creator` as an explicit input and is not
wired into the Markdown skill, so agents fall back to plain named `CreateBranch` drafts (no author).

## Anchor: the `Agent.did` field (added 2026-07-21)

An agent is an ECHO object (`assistant-toolkit` `Agent`, with `name`, its own `Feed`, and a
`Chat.CompanionTo` relation). The `Agent` schema originally had **no** identity key / DID — only an
ECHO object id, which is (i) not key material and (ii) remapped on space import/copy
(`DatabaseRoot.mapLinks`), so not a durable author key.

Resolved: **`Agent` now carries a persisted `did` field** (`Agent.ts`), typed as
`IdentityDid` and seeded once at creation via `IdentityDid.random()` (in `makeInitialized`; optional
so pre-existing agents still load). This is a persisted field value — stable across import/copy —
and uses the **`did:halo:` format**, so it is format-uniform with a human `identity.did` (author
resolution can treat agents and humans through one path). Synthetic today (random bytes, no
keypair); the same field later holds a real HALO DID.

Multiple agents ⇒ multiple `Agent` objects, each with its own `did` ⇒ distinct authors already.

## Design: an `AgentIdentity` service

Introduce a small service the op layer reads, decoupling _what_ authors from _how_ the DID is
derived:

```ts
// assistant-toolkit
interface AgentIdentity { readonly did: string; readonly name?: string; readonly hue?: string; }
class AgentIdentityService extends Context.Tag(...)<AgentIdentityService, AgentIdentity>() {}
```

- The **agent worker** (which knows the current `Agent`) provides the layer when it builds the op
  execution layer, alongside `Database.Service`.
- `SuggestEdit` makes `creator` **optional** and, when absent, reads `AgentIdentityService.did`.
  Declares `services: [Database.Service, AgentIdentityService]`. The LLM never sees `creator`.
- `SuggestEdit` is added to the Markdown skill's `operations`; instructions tell the agent to use
  suggest-edit (not create-branch) when proposing changes for review.

### Today — synthetic DID

Worker derives the identity from the current `Agent` object:

- `did = agent.did` (seeded at creation via `IdentityDid.random()` — a `did:halo:` string, distinct
  per agent, no keypair behind it yet).
- `name = agent.name` (e.g. "Research assistant").
- `hue` = omitted → `stringToHue(did)` fallback (stable palette colour).

No HALO identity, no membership, no key management. Enough for full attribution.

### Companion label/hue for non-member authors

Banner/companion resolve label + hue by looking the `creator` DID up in **space members** — a
synthetic agent is not a member, so it would show the raw DID + fallback hue. Fix cheaply:

- Seed `authorLabels`/`authorHues` (CommentsArticle) and the banner label/hue resolver with agent
  authors: query `Agent` objects in the space, map `agent.did` → `{ name: agent.name, hue }`.
- Encapsulate as `resolveAuthor(did, members, agents)` so humans (members) and agents (Agent
  objects) resolve through one path.

## Future — real identities

- Agents get real HALO identities (a keypair-backed `did:halo:` DID + space membership + chosen
  hue/emoji), stored in the same `Agent.did` field. Then label/hue resolve via `members` exactly
  like humans and the agent-author seeding above is removed. `AgentIdentityService` stays — only its
  provider changes (real DID instead of the random one).
- No scheme migration: `Agent.did` is already `IdentityDid` format, so existing `creator` values on
  suggestion branches stay valid; only the generation (random → real keypair) changes.

## Multiple agents (holds for both phases)

- Identity keyed per `Agent` object ⇒ N agents = N authors, each its own suggestion branch, colour,
  and banner tag. `Branch.suggestion` is already per-creator idempotent, so concurrent agents don't
  collide.
- The review companion already renders multi-author overlays (colour per author, deterministic
  stacking); no change needed for N agents.

## Scope of the "today" change

0. **DONE** — `Agent.did` field (`IdentityDid`, seeded via `IdentityDid.random()` in
   `makeInitialized`; optional for back-compat).
1. `AgentIdentityService` (define in assistant-toolkit) + provide it in the agent worker op layer,
   reading `agent.did` / `agent.name`.
2. `SuggestEdit`: `creator` optional, default from `AgentIdentityService`; add the service.
3. Add `SuggestEdit` to the Markdown skill + update instructions.
4. `resolveAuthor` seeding so agent authors show `name` + hue in banner + companion.
5. Tests: agent suggestion attributed to `agent.did`; two agents ⇒ two authors; label/hue seeded.

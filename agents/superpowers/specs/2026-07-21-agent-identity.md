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

## Anchor: the `Agent` object

An agent is already an ECHO object (`assistant-toolkit` `Agent`, with `name`, its own `Feed`, and a
`Chat.CompanionTo` relation). **The `Agent` schema has NO identity key / DID field** (verified,
`Agent.ts`) — its only stable handle is the ECHO object id (`Obj.getURI(agent)`), which is an object
identifier, not key material. Multiple agents ⇒ multiple `Agent` objects ⇒ distinct ids already.

Caveat: ECHO object ids are **remapped on space import/copy** (see `DatabaseRoot.mapLinks`), so an
object id is not a durably stable author key across copy/import. Two ways to key the synthetic DID:
- **(a) Object id as the handle** — `did:agent:<agent.id>`; simplest, but a copied space re-keys the
  author (acceptable if we don't need cross-space author stability yet).
- **(b) A persisted author field on `Agent`** — add e.g. `authorDid: Schema.optional(Schema.String)`
  seeded once at creation; stable across import and the natural slot to hold a real HALO DID later.
  Preferred if author stability matters. **Open decision.**

## Design: an `AgentIdentity` service

Introduce a small service the op layer reads, decoupling *what* authors from *how* the DID is
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

- `did = 'did:agent:' + <key>` where `<key>` is the object id (option a) or a persisted author field
  (option b) — distinct per agent; NOT key material, just a synthetic author label.
- `name = agent.name` (e.g. "Research assistant").
- `hue` = omitted → `stringToHue(did)` fallback (stable palette colour).

No HALO identity, no membership, no key management. Enough for full attribution.

### Companion label/hue for non-member authors

Banner/companion resolve label + hue by looking the `creator` DID up in **space members** — a
synthetic agent is not a member, so it would show the raw DID + fallback hue. Fix cheaply:

- Seed `authorLabels`/`authorHues` (CommentsArticle) and the banner label/hue resolver with agent
  authors: query `Agent` objects in the space, map `did:agent:<id>` → `{ name, hue }`.
- Encapsulate as `resolveAuthor(did, members, agents)` so humans (members) and agents (Agent
  objects) resolve through one path.

## Future — real identities

- Agents get real HALO identities (DID + space membership + chosen hue/emoji). Then label/hue
  resolve via `members` exactly like humans; the synthetic `did:agent:` scheme and the agent-author
  seeding are removed. `AgentIdentityService` stays — only its provider changes (real DID).
- Migration: `did:agent:<id>` → real DID is a re-key of the suggestion branch `creator`; do it when
  real identities land (few/no persisted agent suggestions before then).

## Multiple agents (holds for both phases)

- Identity keyed per `Agent` object ⇒ N agents = N authors, each its own suggestion branch, colour,
  and banner tag. `Branch.suggestion` is already per-creator idempotent, so concurrent agents don't
  collide.
- The review companion already renders multi-author overlays (colour per author, deterministic
  stacking); no change needed for N agents.

## Scope of the "today" change

1. `AgentIdentityService` (define in assistant-toolkit) + provide it, synthetic, in the agent worker
   op layer.
2. `SuggestEdit`: `creator` optional, default from `AgentIdentityService`; add the service.
3. Add `SuggestEdit` to the Markdown skill + update instructions.
4. `resolveAuthor` seeding so agent authors show `name` + hue in banner + companion.
5. Tests: agent suggestion attributed to `did:agent:<id>`; two agents ⇒ two authors; label/hue seeded.

# code-index — Tasks

_Resume: nothing in flight — PR [#12968](https://github.com/dxos/dxos/pull/12968) is waiting on human review. Uncommitted: none. Last: the chat moved onto the assistant's own stack (`ChatThread` + `FeedModel` + `ChatEditor`), verified in a real browser._

The package is two halves that share one store: an **indexer** that turns this
repository into a SQLite ledger plus a persistent RDF quad store, and a
**workspace** that serves a chat over that graph, where an agent answers
architectural questions by writing code against it.

`SPEC.mdl` is the spec (modules, the commit protocol, features, tests);
`design/ONTOLOGY.md` is the source of truth for the vocabulary. This file is the
ledger only.

## Phase 1: the index

Two stores that cannot share a transaction, so the ledger row is the single
commit marker: announce the new graph in `pending_graph`, swap the quads in one
backend batch, then advance the row. Deletion runs the other way.

### Tasks

- [x] **SQLite ledger + Quadstore/LevelDB graph store with a crash-safe commit protocol** — `reconcile` on every open drops the orphan revision.
- [x] **Off-thread parsing** — worker pool over Effect RPC, `oxc` for parsing and `oxc-resolver` for imports; workers touch no database.
- [x] **Structure from the parser, meaning from rules** — six N3 rule files through the EYE reasoner produce `EffectLayer`, `EchoType`, `Operation`, `Plugin`, `providesService`, … The parser never knows the word "Effect".
- [x] **API vs implementation as separate facts** — `apiDependsOn` / `implDependsOn`, split on the erased boundary.
- [x] **`deus:snippet` per symbol** — declaration with implementation abbreviated, verified by re-parsing every snippet in the index.
- [x] **Incremental crawl keyed on path + mtime** — 0.2s when nothing changed, 4.4s for two files.

## Phase 2: the workspace

One tool (`exec`), a Bun child process, and a log that is the only state. The
agent's whole capability surface is four namespaces documented by the `.d.ts`
the sandbox is written against.

### Tasks

- [x] **Append-only event log per project** — one `events` table, effect-schema per event; transcript, canvas and title are folds over it (`Fold.ts`, shared by server and browser).
- [x] **Bun sandbox with the four host namespaces** — `rdf`, `storage`, `display`, `print`; `sandbox/api.d.ts` _is_ the tool documentation.
- [x] **Agentic loop on effect-ai** — explicit step loop (`generateText` resolves one round trip's calls but does not return to the model), 12-step budget with the last three steps carrying the count remaining.
- [x] **Two providers** — Ollama `gpt-oss:20b` by default, Anthropic as the escape hatch. Both plain `LanguageModel` layers.
- [x] **effect-rpc over NDJSON** — `Watch` streams history and live tail in one stream; `Dispatch` appends; three genuine question RPCs beside them.
- [x] **In-process Vite, no build step** — programmatic API in middleware mode, `@dxos/*` resolved through the `source` condition.
- [x] **Solid shell with the chat as a React island** — the repository's own chat components, unmodified, codemirror composer and all.
- [x] **On the assistant's own stack** — `ChatThread` (`@dxos/react-ui-assistant`) over a `FeedModel` (`@dxos/react-ui-feed`) with `ChatEditor` (`@dxos/react-ui-chat`) as the composer, which is what Composer's `plugin-assistant` renders. Replaced the older `@dxos/react-ui-thread`.
- [x] **Projects in the URL** — `/p/<id>`, last opened remembered per browser.
- [x] **CLI chat** — `code-index chat [--prompt …]`, same log/agent/sandbox rendered as lines.
- [x] **Recorded demo** — the agent presenting a Mermaid diagram, replaying intact after reload ([video](https://pub-39066a86073446d7b77b1c157b660bb5.r2.dev/demos/2026-09-06-code-index-webui/code-index-demo.webm)).

## Phase 3: review hardening

Three review rounds on the PR, 12 real defects. Recorded because two of them
were in code already claimed to work, and two of the tests written for them
proved nothing until deliberately broken.

### Tasks

- [x] **Data integrity in the commit protocol** — interrupted first commit losing its file; interrupted delete leaving queryable quads; `stat` ordered before `readFile`; top-level `exports` fallback arrays.
- [x] **`callId` joined across a tool call's three events** — it was persisted as `"pending"` and re-derived from the seq, so every tool trace in the UI showed code with no output. The test that had asserted the broken shape is corrected.
- [x] **One turn at a time per project** — per-project semaphore in the handlers, plus `Fold.State.running` so "the agent is working" is derived from the log for every reader.
- [x] **In-flight host calls interrupted at the deadline** — a timed-out turn can no longer commit a `storage.set` afterwards.
- [x] **Protocol frames authenticated** — fd 3 alone was not a boundary (a snippet reaches it through `node:fs`), so every frame carries a per-run token the runtime deletes from its environment before evaluating anything.
- [x] **Loopback-only serving** — a non-loopback `--host` is refused before the socket binds; Vite's `fs.allow` scoped to the app and repo roots.
- [x] **SPA fallback restricted to navigations** — a module request that Vite did not answer now 404s naming the URL instead of returning `index.html`, which is what disguised an automerge resolve failure as a MIME-type error.
- [x] **`@dxos/ai` gains `./chat-completions`** — kebab-case deliberately; `dxos-subpath-exports` engages on the first PascalCase subpath and would report the whole unmigrated root barrel.

## Phase 4: follow-ups

Not started. None blocks the PR; each is recorded in its body and on the thread
that raised it.

### Tasks

- [ ] **A real sandbox, if this ever runs code the operator does not trust**
  - Today: one Bun process, scrubbed environment, temp cwd, wall-clock deadline, token-authenticated protocol. That is integrity, not isolation.
  - The shape: evaluated code in a third process with fd 3 unavailable to it, plus filesystem and network denial. `evaluate` is the single seam where the swap happens.
  - Only worth doing for a hosted or shared mode; the local tool's threat model is "the model may write a bad snippet".
- [ ] **`--verify` rehash pass**
  - mtime is the incremental key, floored to the millisecond, so two writes inside one millisecond or a restored timestamp can leave a graph stale. `--force` is the answer today.
  - Deliberately not fixed by changing the ledger's type and the graph IRI shape mid-PR.
- [ ] **Exercise the Ollama path against a live model**
  - Wired and typed but never run: this sandbox cannot host a 20B model. Everything else was verified end to end on Anthropic.
- [ ] **`commit` is the bottleneck** (~369s cold, 634s summed over 8 workers on a `--force` re-index)
  - Quads are written one file at a time through LevelDB, and the cost scales with what is already in the store.
  - Batching across files is the obvious lever; not measured yet.

## References

- PR [#12968](https://github.com/dxos/dxos/pull/12968) — the whole package, in two parts, with the review history.
- `SPEC.mdl` — modules, commit protocol, features, tests.
- `design/ONTOLOGY.md` — the vocabulary the rules assert.
- `rules/50-example.n3` — why reachability is a SPARQL property path and not a materialized closure (147s per pass and 123,692 quads against ~0.2s lazily).

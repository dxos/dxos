# Folding late list, map and text edits across a migration: prior art and options

> **Superseded (2026-10-02).** ECHO moved from one-off migrations to continuous migration: every
> version of an object is kept in a document of its own, and the host translates each edit between
> them through lenses (DESIGN.md §12). The in-place migration code this describes — fold-forward,
> `Migration.fromLens`, the multi-object migration helpers, `ObjectCore.foldAt`, `Obj.getConflict` and
> the migration bench — was removed, and main's one-off migration code was restored. It remains in this
> branch's history: `bfb4ccae39` is the last commit that holds it. The work recorded here is how the
> continuous design was reached, and much of it carried over into it: deterministic translation, the
> structural list and text edits, and the convergence-key merge replay.

_Research for the fold-forward design on branch `claude/m0-migrations-research-zw15ml`, written 2026-09-30.
Labels: **[verified]** means I read the source or ran a probe against `@automerge/automerge@3.5.0` (the
version pinned in this repo). **[inferred]** means my own reasoning, not checked against code. **[doc]**
means the claim comes from the source's own prose and I did not check it against code._

## Answer first

1. **No prior system translates list edits through a general mapping in a way that commutes with
   concurrent edits.** Cambria translates JSON-Patch paths one op at a time. Its list support is
   limited to index-preserving `map`, and `wrap`/`head` at index 0. Its Automerge prototype turns
   indices back into element ids by replaying the history in local arrival order and has no tests
   for concurrent arrays. Edit lenses place conflicts "outside the scope". Baseline (Edwards &
   Petricek, 2025/26), the closest operation-based work, says its projection is non-commutative,
   does not satisfy TP1/TP2, and would need a central primary to replicate. Edwards, Petricek,
   van der Storm and Litt (2024) list "migrating in-flight operations … without centralized
   coordination" as an open challenge. Nobody has solved this problem in general. The workable
   approach is to restrict what the migration may express.
2. **Your "whole put vs. structural edit" failure has a small local cure: a container, once
   created, is never replaced by a fold.** Assign each target key to one channel by its
   _target-schema kind_:
   - maps, lists and text are folded per change, always structurally, including when a late
     change replaced a _source_ value outright;
   - scalars are folded per pass.

   Create every target container exactly once, in a deterministic change. Cambria-Automerge did
   the same thing with its "phantom defaults change". A probe (§6) shows that the mixed channel
   loses both the concurrent late insert and a new client's direct edit, and that the
   single-channel version keeps both on every peer.

3. **The concurrent-migration failure has a documented Automerge idiom:** a hard-coded migration
   change with a fixed actor and timestamp, forked at a point every peer shares. The Automerge docs
   recommend exactly this for migrations. Applied per object, fork every peer's migration change at
   a **canonical point** (the object's creation change, or the previous step's migration change)
   under a derived actor and `time: 0`. Then treat _everything_ after that point as a late write to
   fold per change. The migration becomes one byte-identical change with shared containers, so no
   peer's containers can "lose". The probe confirms identical hashes. The price is folding the
   object's history since that point once.
4. **Element-identity translation is feasible, but only where a correspondence exists.** That means
   declarative `rename`/`map`-style lens entries, not opaque `transform` functions. Automerge's JS
   API does not expose list cursors: Rust supports them and the wasm binding rejects non-text. Ids
   can still be recovered from `decodeChange` ops and from `getBackend(doc).getAll(obj, index)`.
   For text, `getCursorPosition` accepts a cursor built from a decoded op id, which gives a sound
   way to rebase a late text splice instead of calling `updateText(current → next)`.
5. **Read-time translation (Cambria-style) is a poor fit as the storage model.** It would mean
   per-schema materialization, lenses shipped as data, and old clients running new lenses. As a
   _front end_, though, ECHO already has a live `Lens` view with overlay. The strongest
   alternative to folding lists at all is to have new clients read and write _through_ the lens
   into the source properties until old writers are gone. §7 ranks the options.

---

## 1. Cambria (Ink & Switch, 2020) and cambria-automerge

Sources: essay https://www.inkandswitch.com/cambria/ ; paper Litt, van Hardenberg, Henry, "Cambria:
Schema Evolution in Distributed Systems with Edit Lenses", PaPoC '21,
https://dl.acm.org/doi/10.1145/3447865.3457963 (PDF blocked by the proxy; I relied on the essay) ; library
https://github.com/inkandswitch/cambria (HEAD `da89614`, npm `cambria@0.1.2`) ; prototype
https://github.com/inkandswitch/cambria-automerge (HEAD `75f3b67`, built on Automerge 0.14.1).

### 1.1 Patches, not state; writes stay in the writer's schema

- **[doc]** "Under the hood, Cambria actually works with _patches_ … evolving those patches between
  formats. This approach was directly inspired by work on 'Edit Lenses'" (essay, Appendix I).
- **[doc]** Storage model: "store a log of raw writes in the form of the writer schema, and translate
  between versions at read time." The essay reports that write-time translation was tried first and
  abandoned: "It struggled to handle new schemas getting added later on … a write happening
  concurrently with a new schema being registered in the document" (essay, Findings, "Data
  translations in decentralized systems should be performed on read, not on write"). The document
  is never rewritten: "A document has no single 'canonical' schema—just a log of writes from many
  schemas" (Appendix II).
- **[doc]** Lenses are stored in the document as a special change, so a peer can read writes made
  under a schema its code has never seen (Appendix II, "Storing lenses in the document").

### 1.2 How a patch crosses a lens (`src/patch.ts`) [verified]

`applyLensToPatch` (`cambria/src/patch.ts:37-55`) expands nested `add`/`replace` values into scalar
ops (`expandPatch`, `:218-245`), pushes each op through the lens ops _independently_
(`runLensOp`, `:64-216`), and then adds default values. Each lens op rewrites a JSON Pointer
path and knows nothing about the document state. The `targetDoc` parameter is dead
("todo: remove destinationDoc entirely", `:57`).

| Lens op                 | Patch translation (verified in `runLensOp`)                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `rename`                | Rewrites the first path segment, `add`/`replace` only (`:70-81`). A `remove` is not renamed ("TODO: what about other JSON patch op types?").                                                     |
| `hoist` / `plunge`      | Path segment moved up or down (`:83-102`). `plunge` joins an array into the path (`['', host, pathElements]`, `:98`), which is a bug, and its doc-level test is `it.skip` (`test/patch.ts:402`). |
| `wrap` (scalar → array) | `/name…` becomes `/name/0…`. A `null` write becomes `remove /name/0` (`:104-119`).                                                                                                               |
| `head` (array → scalar) | `/name/0…` becomes `/name…`. **Writes to any other index are dropped** (`return null`, `:128`). A remove of element 0 becomes `replace null` (`:121-152`).                                       |
| `in`                    | Strips the prefix, recurses, re-prefixes (`:164-180`).                                                                                                                                           |
| `map`                   | Strips the **first** `/<digits>/` in the path, recurses, and puts **the same index** back (`:182-196`). Indices pass through unchanged.                                                          |
| `convert`               | Value lookup table. Throws on an unmapped value (`:198-209`).                                                                                                                                    |
| `add` / `remove`        | `add` is a no-op on patches. `remove` drops ops under the name (`:154-162`).                                                                                                                     |

So the lens language contains **no operator whose output depends on more than one source
location**: no concatenation, filtering, sorting, split or merge. That is why per-op path rewriting
suffices for it. The essay says so itself:
"Future work should explore lenses that deal with sorting, filtering, and merging or splitting arrays"
(Open questions). It also rules out `firstName + lastName → fullName` in Findings ("Lenses require
well-defined transformations"). **[doc]** The essay also concedes that `convert` "can't guarantee a
useful consistency relation" (Appendix I).

**Relevance:** our failing case `tags: [...from.labels, from.address.city]` is exactly the
list-merge kind of lens Cambria never supported. For `rename`, `in` and element-wise `map`, Cambria
shows that op-local translation is enough, and those are also the only shapes where element
identity has an obvious counterpart.

### 1.3 Arrays inside Automerge: cambria-automerge (`src/cambriamerge.ts`) [verified]

- **One Automerge backend per schema.** The history holds `CambriaBlock{schema, lenses, change}`
  in the writer's schema. Reading in schema S replays every block into S's instance and converts
  foreign ops op by op: `opToPatch` → `applyLensToPatch` → `patchToOps` (`convertOp`, `:303`).
- **Ids ↔ paths.** `buildPath` turns an op's `(obj, elemId)` into an index using the _from_ instance
  (`buildPath`/`findIndexOfElem`, `:668-701`). `patchToOps` turns the index back into an "insert after" elemId
  in the _to_ instance (`patchToOps` from `:574`, `findElemOfIndex(index - 1)` at `:703`). A translated insert **reuses the
  source op's `actor:elem`** (`insertElemId`, `:631-632`), so for an index-preserving lens the target
  element has the same identity as the source element. A lens-generated insert takes
  `instance.elem[actor] + 1`. The README admits this creates "duplicate elemids within a document
  breaking an automerge assumption BUT they will never be in the same sequence".
- **The phantom defaults change.** Every instance is bootstrapped with a change from actor
  `'0000000000'`, seq 1 (`bootstrap`, `:551`). It creates the containers and defaults the schema
  implies, and every first local change depends on it (`:224`). The README explains why:
  "As long as cambria generates the same list of default patches for all peers they will have an
  identical phantom default change." This is the deterministic-container-skeleton idea (§5.1).
- **Translation depends on local arrival order, not on the change's deps.** The from-instance for
  a block is built by `getInstanceAt`, which replays `history.slice(0, blockIndex)`, and `history`
  is in local arrival order (`:334-348`; appends at `:230`, `:266`). Index ↔ elemId resolution runs against the
  local to-instance. For a 1:1 lens both sides see the same set of elements, so this probably works
  out. For `head`, which keeps only index 0, the translated write depends on what each reader has at
  index 0 at translation time. **[inferred]** that can diverge across readers. The repo has no
  concurrent-array tests: the `arrays` / `arrays of objects` / `wrap/head behavior` suites in
  `test/cambriamerge.ts` are all sequential.
- **[doc]** Why it stayed on Automerge 0.14: "hash's and deps were unstable due to generated
  changes, opId's and startOp were unstable due to one op sometimes being translated into many"
  (README). The essay adds: "reading a document in one schema can actually require reading it in
  many different schemas … a better solution might require a deeper integration between Automerge
  and Cambria" (Appendix II).

### 1.4 Limitations the authors report [doc]

- Scalar ↔ array (Appendix III): the shipped `head`/`wrap` pair is called "a defective
  implementation" because it becomes inconsistent after a null write. Six alternatives are
  surveyed, and the essay concludes that consistency, conservation and predictability cannot all
  hold. "Not-nullable fields cannot be converted into arrays … we can't guarantee a minimum (or
  maximum) array length in a distributed system."
- CRDT interaction is left open: "One area for future research is further exploring the
  interaction between the guarantees provided by lenses and CRDTs … what happens if the concurrent
  edits are applied to an array in one schema, and a scalar value in another?" (Appendix II).
- Performance was never measured. There is no lens for sorting, filtering, or merging and splitting
  arrays. There is no way to look up missing data.

### 1.5 What Cambria means for us

- **Where translated data lives.** Cambria keeps writes in their native schema and translates on
  read. We rewrite, then fold. Cambria's reason for rejecting write-time translation (lenses added
  after the write) does not apply to us, because our migrations ship in code and every new client
  has them. Its prototype did not solve the concurrency problem we face either.
- **Transferable ideas:** (a) restrict the lens language so each source op maps to at most one
  target op at a corresponding location; (b) a deterministic container skeleton per schema; (c)
  reuse the source op's identity for the translated element.

---

## 2. panproto

Sources: https://github.com/panproto/panproto (cloned HEAD `f531a8ef`, 2026-09-16) ; book
https://panproto.dev/book/ ; this repo's `packages/core/echo/echo-panproto` (wraps `@panproto/core@0.56.1`,
`pnpm-workspace.yaml:165`).

- **What it is [verified]:** a Rust workspace plus bindings. It parses more than 40 schema
  languages into a graph representation, searches for schema morphisms, compiles migrations,
  builds asymmetric lenses with a complement, checks laws, and has a content-addressed VCS for
  schemas and data (`README.md`).
- **What our package uses [verified]:** `echo-panproto` only calls the state-based structural
  migration: `panproto.migration(src, tgt).map(...).compile()` then `liftJson(record, vertex)`
  (`packages/core/echo/echo-panproto/src/wasm.ts:42-77`). The object `Lens` in `@dxos/echo` does not
  use the engine at all (DESIGN.md §4).
- **Edit lenses exist in Rust [verified]:** `crates/panproto-lens/src/edit_lens.rs` defines
  `EditLens` with `get_edit` and `put_edit` over `TreeEdit`. `TreeEdit`
  (`crates/panproto-inst/src/tree_edit.rs:31-120`) is `InsertNode{parent, child_id, node, edge}`,
  `DeleteNode{id}`, `ContractNode`, `RelabelNode`, `SetField`, `RemoveField`, `MoveSubtree`, fans,
  `JoinFeatures` and `Sequence`. **Translation keeps node ids.** An insert is translated to an
  insert with the same `child_id` and a remapped anchor and edge (`edit_lens.rs:526-568`). Nodes
  outside the view go into the complement (`dropped_nodes`). Ordering is a plain
  `position: Option<u32>` on the node (`crates/panproto-inst/src/metadata.rs:78-80`). There are no
  sequence CRDT ids and no concurrent edit model.
- **No CRDT story [verified]:** the book says "`panproto-vcs` instead computes a repository merge and
  may return conflicts requiring a resolution … convergence properties from CRDTs do not transfer
  to the VCS merge" (`book/src/explanation/related-work.md:51`). The edit-law checks "compare this
  incremental result with whole-state `get` and `put` for one supplied edit"
  (`lenses-roundtrip.md:35`). Only sequential laws are checked.
- **Not reachable from TypeScript [verified]:** no `edit` symbol appears in
  `bindings/typescript/src` at HEAD, nor in the installed `@panproto/core@0.56.1` `.d.ts` files.

**Fit:** panproto confirms the _shape_ of the right answer: identity-preserving edit translation
with a complement for dropped data. It supplies nothing for sequences or concurrency, and none of
it is callable from our runtime today. Its `TreeEdit` model (ids everywhere, order as a separate
attribute) is closer to Baseline (§4.3) than to Automerge.

---

## 3. Automerge primitives and guidance

Version: `@automerge/automerge@3.5.0` from this repo's `node_modules`. Rust source from
https://github.com/automerge/automerge (HEAD `ddbff535`, 2026-09-24). Probe scripts are in
the research session scratchpad (not kept).

### 3.1 Cursors: text only in JS [verified]

- The Rust core supports both: "Obtain the stable address (Cursor) for a `usize` position in a
  Sequence (either `ObjType::List` or `ObjType::Text`)" (`rust/automerge/src/read.rs:196`, `:206`).
- The wasm binding refuses anything else:
  `if obj_type != am::ObjType::Text { return Err(error::Cursor::InvalidObjType(obj_type)); }`
  in both `getCursor` and `getCursorPosition` (`rust/automerge-wasm/src/lib.rs:1647`,
  `:1695`, error text at `:2839`). The probe `cursor.mjs` prints
  `Cannot getCursor: RangeError: cursors only valid on text - obj type: list`. This matches the
  M0 finding, but the cause is the binding, not the core, so a small upstream change could lift
  it.
- **Text cursors can be built from op ids [verified]:** a cursor string is `counter@actor`. The
  k-th character a change inserted has op id `(startOp + k)@actor` (`A.decodeChange`).
  `A.getCursorPosition(doc, ['t'], '3@…')` resolves it, and a deleted character resolves to where it
  was (probe `textcursor.mjs`: position 2, then 4 after a concurrent prefix insert and delete).

### 3.2 Element ids without list cursors [verified]

- `A.decodeChange(change).ops` / `A.inspectChange(doc, hash)` expose each op's `obj`, `elemId`
  (the "insert after" reference, or `_head`) and `insert: true` (probe `ids.mjs`). A late change's
  list edits are therefore available **in identity terms** without diffing values.
- `A.getBackend(doc).getAll(objId, index[, heads])` returns `[datatype, value, opId]`. For an
  object or text element the op id is the element's make op, which is its elemId, and it stays
  stable. For a scalar element it is the _latest value op_ (`8@…` becomes `12@…` after an update),
  so scalar elements lose their visible identity once updated (probe `lowlevel.mjs`). ECHO stores
  strings as text objects unless they exceed `STRING_CRDT_LIMIT`, and refs as maps
  (`object-core.ts:53`, `:700`), so most ECHO list elements have a stable, readable id. Numbers and
  booleans do not. `getBackend` is a low-level API.
- **No list move [verified]:** no move op in the 3.5 JS API or the Rust `src`. A reorder is
  delete + insert, which mints a new id (M0 finding). The published algorithms are Kleppmann,
  "Moving Elements in List CRDTs", PaPoC 2020 (https://martin.kleppmann.com/papers/list-move-papoc20.pdf),
  and Da & Kleppmann, "Extending JSON CRDTs with Move Operations", PaPoC 2024
  (https://arxiv.org/abs/2311.14007), which says it plans integration into Automerge **[doc]**.

### 3.3 `A.diff` patch shapes [verified, probe `diff.mjs`]

`put {path, value}` (a whole container replacement appears as `put … value: {}` followed by nested
puts), `insert {path: [...list, i], values}`, `del {path, length?}`, `splice {path: [...text, i],
value}`. A string pushed into a list appears as `insert values:[""]` followed by a `splice` into
the element. Paths are **index-based against the running state**, with no ids. `diffPath` exists
and is marked experimental.

### 3.4 `changeAt` [doc]

The JS docs (`implementation.d.ts:278-300`) describe the intended use as reconciling edits made
concurrently: "Apply all the unreconciled changes to the document using `changeAt(doc, oldHeads, …)`"
and then `diff` from the returned heads. An index used in a `changeAt(heads)` callback is
interpreted against `A.view(doc, heads)`. So "index in the fork's view" **is** an elemId reference.
That is the property the fold relies on. The open question is only which target element
corresponds to the source element.

### 3.5 Deterministic changes and migrations [verified in the docs and by probe]

- The Automerge docs, "Modeling data" → "Setting up an initial document structure" and "Versioning"
  (https://automerge.org/docs/cookbook/modeling-data/), say: "Simply doing `Automerge.change()` on
  each device to initialize the schema will not work … each device has a different actorId". They
  recommend hard-coding the initial change. For migrations: "you can also hard-code migrations
  that upgrade from one schema version to the next, using the same technique (either hard-coding
  the change as a byte array, or making a change on the fly with hard-coded actorId and timestamp).
  Do not modify the initial change; instead, every migration should be a separate hard-coded change
  that depends only on the preceding change." They also note the problem you hit: "two users
  independently perform the same migration … you need to ensure that the two migrations don't
  clash". Finally: "Some further ideas on safe schema migrations in CRDT apps are discussed in the
  Cambria paper, but these are not yet implemented in Automerge."
- Probe `ids.mjs`: two independent `A.change(A.init({actor: fixed}), {time: 0}, …)` produce equal
  hashes. Edits pushed into the shared list on two peers both survive the merge. Two roots created
  under different actors merge to one visible list, and the loser's edit disappears
  (`{"list":["edit-in-d"]}`).
- Caveat [verified by M0, `fold-at.test.ts`]: two _different_ changes under one (actor, seq) make
  Automerge reject the merge (`duplicate seq`). A "fixed actor" must therefore be derived from the
  change's **content**, not only its role. `ObjectCore.foldChangeAt` already does this with a probe
  actor (`object-core.ts:543-559`).

### 3.6 Other Automerge and Ink & Switch work

- Marks are text-only spans, so they cannot tag list provenance. **[inferred]** from the API, which
  takes a path to text.
- I found no Ink & Switch or Automerge-team publication after Cambria on translating edits between
  schemas. I searched the Patchwork notebook index, Automerge docs, issues and discussions.
  Upwelling, Keyhive, Beelay and Embark address drafts, access control, sync and dynamic documents
  respectively. The only official migration guidance is §3.5. (The GitHub issue search MCP returned
  nothing for these queries, and the REST search API is blocked in this sandbox, so an issue I did
  not find may exist.)

---

## 4. Theory

### 4.1 Edit lenses (Hofmann, Pierce, Wagner, POPL 2012) [verified in the PDF, http://dmwit.com/papers/201107EL.pdf]

- The list module's edits are `mod(p, dx)`, `ins(i)` and `del(i)` **at the end**, plus
  `reorder(f)`. To insert in the middle you insert at the end and then reorder. The list mapping
  lens translates `mod` element-wise and carries `ins`, `del` and `reorder` **unchanged** (Fig. 4).
  The partition lens (tagged list ↔ pair of lists, the nearest analogue of our concatenation)
  **needs a complement**, the tag list, to translate positions (Fig. 5-6). The paper does not provide
  "edits that copy the contents of some position into other positions", and that is "left for
  future work" (§5).
- On concurrency: "A full-blown synchronization tool would also include … some mechanism for
  dealing with conflicts between disconnected edits … which is outside the scope of this paper"
  (footnote 1).
- **For us:** the laws are sequential. Translation is a function of (edit, complement), and the
  complement is state. Two replicas that translate concurrent edits against different complements
  get positions that need not commute. That is the concat/partition problem we have with
  `[...labels, city]`.

### 4.2 Delta lenses (Diskin, Xiong, Czarnecki, JOT 2011) [verified: abstract and intro, https://www.jot.fm/issues/issue_2011_01/article6.pdf]

"Existing bidirectional model transformation (BX) languages are mainly state-based: model alignment
is hidden inside update propagating procedures … We propose to separate concerns and consider two
distinct operations: delta discovery (alignment) and delta propagation." **For us:** the value-LCS
in `fold-edit.ts` (`commonSubsequence`, `rebaseListEdit`) is state-based alignment, rediscovered
from values. Automerge changes already _are_ deltas with alignment: element ids in the ops. Delta
lens theory argues for propagating those ids rather than re-aligning by value. The paper does not
treat concurrent updates; I found no mention.

### 4.3 Baseline / Operational Differencing (Edwards & Petricek, arXiv 2512.09762, v2 June 2026) [verified in the PDF]

- Every record field and list element has a permanent id. Operations are id-based
  (`p insert E before E′`, `p delete E`, `p move p′` = copy then delete). Schema changes are
  operations too. `ListOf` wraps a value into a one-element list **with element id `1`**, a
  deterministic id for a schema-created element (§2).
- `Project` carries a data operation across an intervening schema operation "preserving its intent":
  a `write` through `ListOf` becomes `.1 write` (Fig. 3). This is exactly a fold of a late write
  through a migration.
- The authors are explicit about the limits: "our functions return a pair of operations not just
  one, retraction may fail, and they do not satisfy the correctness properties TP1 and TP2 … making
  projection non-commutative", and "extending our approach to do replication would require a
  centralized primary" (§7).
- **For us:** this is the most recent and closest formal work, and it confirms that general
  intent-preserving projection does not commute. What it adds is id-based data plus deterministic
  ids for schema-created elements. That combination is what makes a projected op well-defined
  without comparing states.

### 4.4 Challenge statement (Edwards, Petricek, van der Storm, Litt, arXiv 2412.06269) [verified]

"The deployment must also deal with migrating 'in flight' operations so that all replicas converge
on the same state without data loss, and ideally without centralized coordination. A radical
approach could try to incorporate schema change operations into the underlying datastore itself
(possibly a CRDT)" (§4, Extract Entity, local-first variant). Ink & Switch's Geoffrey Litt is a
co-author. The problem is recognized as open.

### 4.5 What the theory does and does not give

I found no published construction that translates list inserts and deletes through a general
mapping and commutes with concurrent edits. **[inferred]** Such translation commutes in one case:
**when it is a pure function of the op in identity terms**, meaning the op's own ids plus
deterministically derived target ids, and never of replica state such as indices, values or a
complement. The translated ops are then ordinary target-CRDT ops, and their merge is
order-independent because the CRDT's is. The condition holds when the mapping gives each source
element a fixed counterpart: rename, element-wise map, wrap into a fixed id. It fails when a target
position depends on other elements' values: concatenation, filtering, sorting, computed strings.
In those cases the fallback is value alignment, which is deterministic when the fold is authored
byte-identically (what `foldChangeAt` does). It converges, but it can misplace elements and does
not match `transform(merged source)`.

---

## 5. Synthesis: what each finding does for the listed failures

### 5.1 "Some keys are folded whole by the per-pass channel, then a structural fold edits a dead container"

- **Fix: static channel assignment by target-schema kind [inferred, probe-backed].**
  - A target key whose schema type is a map, list or text is **only** folded per change, as edits
    into the existing container. The same holds for every container at a fixed path inside it, but
    not inside list elements, whose containers are created by the element's own insert.
  - A scalar key is only folded per pass.
  - `dependsOnReplaced` then goes away for containers. A late change that replaced
    `address` wholesale still yields `transform(before) = [l1,l2,A]` and
    `transform(after) = [l1,l2,B]`. That diff is `delete A, insert B` inside the migration's list,
    not a new list. The reason for the whole-value fallback was that the per-pass fold _might have_
    replaced the container, and that reason disappears once nothing replaces containers.
  - Kind changes are ruled out by validating the output against the target schema; a mismatch
    becomes a report, not a whole put.
- **Probe `channels.mjs` [verified]:** tags = `[...labels, city]`. X replaces `address`, Y pushes
  `l3`, and new client N inserts `n` into `tags` after the migration.
  - Single channel, folds per change at `fork = M` with a content-derived actor, computed
    independently on two peers: both converge to `["n","l1","l2","B","l3"]`. There are 7 changes in
    total: each fold was authored once despite both peers folding both late changes.
  - Mixed channels, X folded whole and Y structural: `["l1","l2","B"]`, losing **both `l3` and the
    direct edit `n`**. A whole put of a container is also the "direct edit silently overwritten"
    case, not only the dead-container case.
- **Absent containers:** a fold that must create a container that did not exist (optional list) is
  a race. Two concurrent folds each `put` a new list, and one is invisible. The fix is a
  deterministic **container-creation change** per (object, step, path), forked at `M`, with a
  content-derived actor and `time: 0`. Every fold that needs the container forks from `M` plus that
  change. This is the cambria-automerge phantom-defaults idea (§1.3) applied lazily. The simpler
  rule, which Cambria's `add` op also uses, is that migrated container keys are required and
  default to empty. Deleting a container key and recreating it is the same race; prefer emptying.
- **Throwing transforms** (§5.5 below): with a single channel, a transform that throws on an
  intermediate state cannot push a container key into the whole-value path any more. It needs its
  own deterministic rule.

### 5.2 "Whether a key was folded whole depends on which changes a peer saw in which pass"

Static assignment removes the dependence entirely, because the channel is a function of the target
schema, not of history. This is the main argument for it over any dynamic classification.

### 5.3 "Two peers run the same migration from the same heads; containers differ"

(And from different heads, which is the common case.)

- **Fix A: canonical-fork migration change [verified by probe, recommended].**
  - Author the step's migration change at a point every peer derives identically: the object's
    creation change for step 1 (ECHO records `system.creationHeads`, or the change that created the
    object is found in history), and the previous step's migration change for step k > 1.
  - Use an actor derived from (document, object, step and the change's ops) and `time: 0`.
  - The type switch and the marker (whose `preHeads` are now the canonical heads) go in the same
    change.
  - Every change after the canonical point is a late write, folded per change by the existing
    machinery.

  Probe `channels.mjs`: two peers with different heads (one holding X, one holding Y) produce
  **identical migration hashes**. There is one set of containers and nothing to lose.
  `findPostMigrationHeads`'s "greatest actor wins" logic becomes unnecessary.
  Costs:
  - The whole object history since the canonical point is folded once. At the measured ~15 ms per
    late write, a 1,000-change object costs about 15 s one-time. Only changes that touch this
    step's source keys produce folds, and those are shared across peers.
  - Text targets are rebuilt splice by splice.
  - `transform` must be total over historic states.
  - Transform code drift: two peers running different builds of the same step author different
    changes. The content-derived actor makes that two concurrent migrations again rather than a
    `duplicate seq` failure.

- **Fix B: deterministic skeleton plus per-peer fill.** Rejected. **[inferred]** Shared containers
  created at the canonical point, then filled by each peer's own migration change, duplicate the
  fill (both peers insert `l1, l2, A`). Deduplicating with a deterministic "delete the loser's
  inserts" change loses new-client edits made inside the loser's elements, since ECHO strings are
  text objects and those edits live inside them.
- **Current state for comparison [verified by probe]:** per-peer migrations at their own heads
  give `tags` 2 conflicts. The visible list is the winner's, and the other peer's direct edit `nP`
  is gone.

### 5.4 Inserts on one anchor come out reversed; value-LCS misplaces elements

- The reversal is an index artefact. Consecutive `insertAt(i)` calls in one change each insert
  after element i−1. The working-tree edit to `fold-edit.ts` (merging same-anchor inserts into one
  splice) fixes this. **[verified]** by reading the diff; I did not run its tests.
- **Element-identity translation (§3.2) [inferred design, primitives verified]**, for keys whose
  output has a known element correspondence:
  1. Read C's list ops from `decodeChange`: `insert after e`, `delete e`, `put at e`.
  2. Map each source id to its target counterpart:
     - at the migration change, target element i ↔ source element i at the canonical heads (the
       k-th insert op in `M` against the k-th source element);
     - for a fold, the k-th insert op in `fold(C)` ↔ the k-th insert op in `C`.

     Both rules are recomputable from history, with no stored mapping.

  3. Turn each target id into an index in the fork view: `getAll(listObj, i, forkHeads)` for
     object and text elements, or a text cursor for characters. Apply the edit in `changeAt(fork)`.

  This removes the ambiguity with duplicate values. It also removes the chance that a
  "previous ≠ current" LCS locates the wrong element, because correspondence comes from history,
  not values. Limits:
  - It only works for structural mappings: Cambria's `rename`, `in` and element-wise `map`
    (`Lens` `rename` and element-wise codecs). Opaque `transform` functions keep value-LCS.
  - Scalar list elements lose their visible id after an update.
  - A reorder in the source is delete + insert, so the target gets a new element too. That is
    consistent, but identity is not preserved.
  - Order among concurrent inserts after the same anchor follows the _fold_ op ids, not the source
    op ids, so the target order can differ from `transform(merged source)`. The probe shows
    `[…,"B","l3"]` against a recomputed `[…,"l3","B"]`. This converges and loses nothing, but it
    differs from a recompute.

### 5.5 Text folded as `A.updateText(current → next)` instead of the late change's own edit

- For a text target that is a rename or copy of a source text [primitives verified]: take C's
  splice ops (insert after char `e`, delete char `e`) from `decodeChange`. Map `e` to its target
  counterpart: position at `M` for chars the migration copied, the k-th insert of `fold(C')` for
  chars a fold copied. Build the cursor string `counter@actor` and resolve it with
  `getCursorPosition(forkView, path, cursor)`. Then `A.splice` at that index inside
  `changeAt(fork)`. The late change's own edit is replayed character-accurately with no diff.
- For computed strings (`first + ' ' + last`) there is no correspondence. Keep
  `diff(transform(before), transform(after))` placed by LCS on the current value, which is what the
  working tree now does, or fold them as scalars. **Recommendation:** classify a computed string
  as a _scalar_ target (per-pass whole put). Only rename- or copy-derived text is a _text_ target
  (per-change splice replay). That makes the channel a function of the mapping entry, which is
  still static.
- Throwing transforms **[inferred]**: a deterministic rule is needed. One option: if
  `transform(before)` throws, use the target value at the fork as `previous`. The fork is
  byte-identical, so this is deterministic. If `transform(after)` throws, author no fold for that
  change. Caveat: diffing against the fork's target rather than against C's own edit can
  re-express merge-order differences, and two such folds of sibling changes are not byte-identical,
  so they can duplicate. Keep it as a rare-path fallback, not the norm.

### 5.6 Read-time translation vs. write-time fold

- **Pure Cambria read-time translation** means storing writer-schema ops and translating on read:
  - Automerge would need per-schema materialization. cambria-automerge ran one backend per schema
    and replayed history per schema, and its README says Automerge 1.0 frustrated the integration.
  - ECHO's queries and indexes read materialized Automerge state.
  - Old clients would need lenses as data in the document; our transforms are code.

  **Poor fit.** [inferred]

- **Hybrid that fits:** new clients read _and write_ through the existing object `Lens`
  (`Lens.get` / `Lens.put` with overlay for target-only fields) while old writers may exist, and
  the physical migration runs later. Every write, old or new, lands in the **source** properties,
  so the CRDT merges one representation and there is nothing to fold. Translation happens at the
  writer, locally and sequentially against its current state, which is the setting edit-lens
  theory covers. Costs:
  - list and text writes through a non-trivial mapping need a `put` that turns a view edit into a
    source edit: the edit-lens problem in reverse, but without concurrency at translation time;
  - read cost;
  - the physical migration is still needed eventually, and it runs when old writers are presumed
    gone. That is a policy gate, not an epoch, and it is not guaranteed.
  - Mappings with no sensible `put` (concatenations) cannot be written through, and Cambria
    Appendix III shows why even `wrap`/`head` is lossy.

---

## 6. Probes run (Automerge 3.5.0; the scripts were not kept)

| Script           | Shows                                                                                                                                                                                                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cursor.mjs`     | `getCursor` on a list throws `cursors only valid on text - obj type: list`.                                                                                                                                                                                                                                               |
| `textcursor.mjs` | A text cursor built from a decoded op id (`startOp + k @ actor`) resolves, including after the char is deleted.                                                                                                                                                                                                           |
| `ids.mjs`        | Decoded ops carry `elemId`/`insert`. A fixed actor with `time: 0` gives byte-identical changes that merge as one. Independent roots lose one side's container.                                                                                                                                                            |
| `lowlevel.mjs`   | `getBackend(doc).getAll(obj, i)` gives element op ids. Stable for text and object elements, not for updated scalars.                                                                                                                                                                                                      |
| `diff.mjs`       | `A.diff` patch shapes (index-based: `put`/`insert`/`del`/`splice`).                                                                                                                                                                                                                                                       |
| `channels.mjs`   | Canonical-fork migration hashes are equal across peers. Single-channel structural folds converge to `["n","l1","l2","B","l3"]` on both peers with each fold authored once. A mixed whole plus structural fold loses `l3` and the direct edit `n`. Per-peer migrations conflict at `tags` and lose one peer's direct edit. |

The probes use plain Automerge documents shaped like ECHO's `data` map, not `ObjectCore`. They
demonstrate the Automerge semantics the designs rely on, not the ECHO implementation.

---

## 7. Ranked options (fit to coordination-free ECHO, main risk)

1. **Static single channel per target key plus deterministic container creation** (§5.1, §5.2).
   Container-kind keys are per-change structural only and never whole-put. Scalars are per-pass
   only. Containers are created once by a content-derived change forked at `M`, or required and
   empty-by-default.
   - _Fit:_ high. It is a local change to `fold-forward.ts`: delete `dependsOnReplaced` and the
     whole path for container keys, and add a creation change. The probe demonstrates it.
   - _Main risk:_ throwing or partial transforms on intermediate states now need a deterministic
     container-level fallback (§5.5). A computed-string output must be declared scalar, or the
     text channel's diff misbehaves.
2. **Canonical-fork, byte-identical migration change** (§5.3 A). Fixes concurrent migrations and
   deletes the winner-selection logic.
   - _Fit:_ high. It is the documented Automerge idiom, extended per object, and the probe
     confirms it.
   - _Main risk:_ one-time cost of folding the object's history since creation (and `transform`
     totality across all historic states). Code drift yields concurrent migrations again, which is
     safe with a content-derived actor.
   - Pairs with 1: together they make every container write deterministic.
3. **Element-identity translation for structural mapping entries, value-LCS for opaque
   transforms** (§5.4, §5.5).
   - _Fit:_ medium. Gains: exact placement for rename, map and copy, character-accurate text
     replay, no duplicate-value ambiguity.
   - _Main risk:_ engineering against low-level APIs (`decodeChange`, `getBackend().getAll`, no
     list cursors in JS), plus a provenance walk over history. It covers only `fromLens`-style
     entries. Scalar list elements lose identity after updates, and target order among concurrent
     inserts follows fold op ids.
4. **Write-through lens until old writers are gone, then migrate** (§5.6 hybrid).
   - _Fit:_ medium. It sidesteps folding lists and text entirely, and ECHO already has the lens
     and overlay.
   - _Main risk:_ it needs an invertible, edit-level `put` for every list or text mapping new
     clients write through, which concatenations do not have. It also defers rather than removes
     the physical migration, and the "old writers gone" gate is a policy that an offline client can
     violate. That violation is harmless for writes into the source but reopens folding after the
     migration.
5. **Cambria-style read-time translation of the op log**.
   - _Fit:_ low.
   - _Main risk:_ per-schema materialization at read time, conflicting with Automerge-native
     materialization, ECHO indexing and queries, and code-defined transforms. The authors
     themselves call its CRDT interaction open and its performance unmeasured.

**Suggested combination:** 1 + 2 now, with value-LCS as today for opaque transforms. Then 3 for
`Migration.fromLens` rename, map and copy entries and for text. Keep 4 as the recommendation for
mappings that are not structural and must stay writable by new clients during the transition
(for example, keep a concatenated list as a lens view instead of migrating it). Document the
residual semantics: concurrent late inserts at one anchor merge in fold-op-id order, not in
`transform(merged)` order, and deletes win over concurrent nested edits inside the deleted
element, as in any Automerge list.

---

## Sources

- Ink & Switch, "Project Cambria: Translate your data with lenses" (2020): https://www.inkandswitch.com/cambria/
- Litt, van Hardenberg, Henry, "Cambria: Schema Evolution in Distributed Systems with Edit Lenses", PaPoC '21: https://dl.acm.org/doi/10.1145/3447865.3457963
- `cambria` source: https://github.com/inkandswitch/cambria (`src/patch.ts`, `src/lens-ops.ts`, `src/reverse.ts`, `src/defaults.ts`, `src/doc.ts`, `test/patch.ts`)
- `cambria-automerge` source: https://github.com/inkandswitch/cambria-automerge (`src/cambriamerge.ts`, `README.md`, `test/cambriamerge.ts`)
- panproto: https://github.com/panproto/panproto (`crates/panproto-lens/src/edit_lens.rs`, `crates/panproto-inst/src/tree_edit.rs`, `crates/panproto-inst/src/metadata.rs`, `book/src/explanation/related-work.md`, `book/src/explanation/lenses-roundtrip.md`); book https://panproto.dev/book/
- DXOS: `packages/core/echo/echo-panproto/src/wasm.ts`, `README.md`; `packages/core/echo/echo-client/src/proxy-db/fold-forward.ts`, `fold-edit.ts`; `packages/core/echo/echo-client/src/core-db/object-core.ts`; `.agents/projects/lenses/{DESIGN,IMPLEMENTATION-PLAN,M0-REPORT}.md`
- Automerge source: https://github.com/automerge/automerge (`rust/automerge-wasm/src/lib.rs:1638-1705,2839`; `rust/automerge/src/read.rs:196-242`); `@automerge/automerge@3.5.0` `dist/implementation.d.ts`
- Automerge docs, Modeling data (initial structure, versioning): https://automerge.org/docs/cookbook/modeling-data/
- Hofmann, Pierce, Wagner, "Edit Lenses", POPL 2012: http://dmwit.com/papers/201107EL.pdf (ACM: https://dl.acm.org/doi/10.1145/2103621.2103715)
- Diskin, Xiong, Czarnecki, "From State- to Delta-Based Bidirectional Model Transformations: the Asymmetric Case", JOT 2011: https://www.jot.fm/issues/issue_2011_01/article6.pdf
- Edwards & Petricek, "Baseline: Operation-Based Evolution and Versioning of Data", arXiv 2512.09762: https://arxiv.org/abs/2512.09762
- Edwards, Petricek, van der Storm, Litt, "Schema Evolution in Interactive Programming Systems", arXiv 2412.06269: https://arxiv.org/abs/2412.06269
- Kleppmann, "Moving Elements in List CRDTs", PaPoC 2020: https://martin.kleppmann.com/papers/list-move-papoc20.pdf
- Da & Kleppmann, "Extending JSON CRDTs with Move Operations", PaPoC 2024: https://arxiv.org/abs/2311.14007
- Ink & Switch Patchwork notebook (checked for schema work; none found): https://www.inkandswitch.com/patchwork/notebook/

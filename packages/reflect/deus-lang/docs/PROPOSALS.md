# Proposals

Each proposal from [`USER.md`](./USER.md) is weighed against the alternatives before anything is
built. The chosen approach is logged in [`DECISIONS.md`](./DECISIONS.md).

## P1. Split the definition graph into subgraphs

**Proposal:** infer coarse subgraphs (library, organization, project) from the authority part of
definition IRIs.

**The problem it solves:** one codebase holding every definition becomes one huge graph. Nobody
can tell what belongs to whom, publish or sync part of it, or load a slice of it.

| Approach                                       | How membership is decided                                                                                         | Strengths                                                    | Weaknesses                                                                                                                                                                                                       |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Per-definition IRI authority (the proposal) | Each definition's IRI, e.g. `https://dxos.org/…` → `dxos.org`                                                     | Global, collision-free identities; human-meaningful          | Terms have no IRI, only types do. The same hash can be written by two projects (content addressing deduplicates), so a definition has no single owner. Authority alone (`dxos.org`) is coarser than "a library". |
| B. Unison projects                             | A project is a unit with its own branches and history; dependencies are pinned releases mounted under `lib.<dep>` | Proven in UCM; ownership, publishing and versioning fall out | The project id is a local name, not globally unique; no story for types shared across projects                                                                                                                   |
| C. Lean/Lake packages                          | Declared in a manifest; modules belong to the package directory they are in                                       | Explicit, simple tooling                                     | Files, not hashes, define membership; this is the model Unison moved away from                                                                                                                                   |
| D. Automatic clustering                        | Partition the dependency graph (SCCs, communities)                                                                | No declarations                                              | No ownership meaning; partitions move as code changes                                                                                                                                                            |

**Choice: B with A's identity.** A **project** is the unit of ownership. Its identity is an IRI
whose authority and leading path name it globally (`https://dxos.org/deus/std`), as the
proposal asks. A project has its own branches and history (UCM), and pins its dependencies as
releases of other projects.

The project's **subgraph** is _inferred_: the definitions reachable from its namespace minus
those reachable from its pinned dependencies. It is not tagged per definition, because a hash
can be shared and ownership must survive that.

Types keep their own IRIs. A type IRI under a project's IRI is checked to belong to it, so the
authority part also guards who may mint a type in a namespace. Storage, sync and images
partition by project.

## P2. Requirements on external tooling and registries

**Proposal:** describe dependencies on fetched binaries (as Nix does), and the registries they
come from (npm, crates, apt…), in the language.

| Approach                                                                                                   | Strengths                                                                      | Weaknesses                                               |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------- |
| A. Nix-style fixed-output declarations: URL + expected hash; a fetch is valid only if the bytes match      | Reproducible; content-addressed like the rest of DEUS                          | Says nothing about _which code_ needs the tool           |
| B. Delegate to each ecosystem's lockfile (package-lock, Cargo.lock)                                        | Reuses existing tooling                                                        | Many formats, no single view, not hash-addressed in DEUS |
| C. Tools as **abilities**: code that runs `wasmtime` has `{Tool}` in its effect row; a handler supplies it | The type tells you what needs the outside world; tests can swap a fake handler | Needs the declarations of A to know what to fetch        |

**Choice: A + C.** Requirements and registries are ordinary DEUS data: `Registry` (npm, crates,
apt, GitHub releases, a plain URL template, with how each states integrity) and `Requirement`
(registry, package, version, platform, expected SHA-256). Because they are definitions, they
are content-addressed and pinned by their hash: the codebase is the lockfile.

Access goes through an ability (`Fetch`/`Tool`), so a function that needs a binary says so in
its type. The CLI's handler resolves a requirement, verifies the hash, caches the result under
it in the store (`cache/fetch/<sha256>`), and refuses a mismatch.

## P3. Replicate the store through R2, with compaction

**Proposal:** push to an R2 bucket (the artifacts bucket is suitable), every push a new file;
compact the graph (intern, dedupe, drop old definitions), perhaps sedimentree/Subduction style,
so concurrent clients can compact locally and push overlapping blobs.

| Approach                                                                                                                 | Strengths                                                                                                                                                                                                       | Weaknesses                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| A. Git-style packs plus mutable refs (compare-and-swap on a branch file)                                                 | Familiar; small reads                                                                                                                                                                                           | A mutable ref is a coordination point; concurrent pushers race, and R2 offers only per-object conditional writes |
| B. Append-only bundles (the proposal): each push uploads one immutable file of new objects plus the causal nodes it adds | No coordination: names are content hashes, so writes never conflict; readers take the union                                                                                                                     | Many small files; needs compaction and a way to find branch heads                                                |
| C. B with **sedimentree** compaction (Ink & Switch, used by Subduction)                                                  | Deterministic chunk boundaries (a causal node whose hash has ≥ k leading zero hex digits ends a level-k stratum), so two clients compacting the same history produce byte-identical bundles that dedupe by hash | Boundaries are probabilistic, so strata sizes vary                                                               |

**Choice: C.** A bundle is a canonical, sorted S-expression of objects, named by its hash under
`deus/<project>/bundles/`. A push uploads one level-0 bundle; nothing is ever overwritten.

Branch heads need no mutable ref: they are the maximal causal nodes across bundles. Two
concurrent pushes to one branch show up as two heads, which `deus pull` merges three-way, as
for local branches.

Compaction collects the objects introduced between level-k boundaries into one bundle.
Because the boundaries are hash-derived and the serialization is canonical, compactions done
independently overlap exactly. Any client may delete a smaller bundle once a larger one
provably covers it.

Dropping old definitions is garbage collection by reachability: a definition reachable from
no retained head, under a retention policy (for example, heads of the last N causal nodes), is
left out of the next compaction.

The host gains `http` and `hmacSha256` operations. SigV4 request signing is written in DEUS.

## P4. Layers of the codebase

**Proposal:** layers for spec, code, proofs, tests, artifacts, LLM codegen, cache, test results…

| Approach                                                                    | Strengths                                              | Weaknesses                                                   |
| --------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| A. One directory (store) per layer                                          | Policies are physical: replicate or delete a directory | Must decide a layer per object at write time                 |
| B. One store, layer derived from each object's kind, policy table per layer | No tagging; a layer is a pure function of the object   | Policies apply per object, not per directory                 |
| C. Layers as namespace prefixes (`spec.*`, `code.*`)                        | Visible in names                                       | Conflates naming with storage; a rename would change a layer |

**Choice: B, laid out as A.** The layer is a function of the object's kind, and the store files
each object under its layer's directory, so policies are physical. The layers and their rules:

| Layer      | Objects                                                        | Hashed?           | Replicated?                              | May depend on      |
| ---------- | -------------------------------------------------------------- | ----------------- | ---------------------------------------- | ------------------ |
| spec       | MDL requirement and extension blocks                           | yes               | yes                                      | spec               |
| code       | types, abilities, terms                                        | yes               | yes                                      | code               |
| proofs     | theorems with their proof scripts                              | yes               | yes                                      | code, spec, proofs |
| tests      | tests, perf requirements                                       | yes               | yes                                      | code, spec         |
| results    | verdicts keyed by the hash they judge, with who checked them   | derived           | yes (as claims; proofs are re-checkable) | anything           |
| artifacts  | images, wasm modules, binaries                                 | content-addressed | optional                                 | code               |
| provenance | LLM codegen records: model, prompt digest, the hashes produced | no                | yes                                      | anything           |
| cache      | anything re-computable                                         | no                | never                                    | —                  |

The dependency column is enforced when adding: code that depends on a test is rejected.

## P5. Docker containers in MDL

**Proposal:** represent Docker containers in `.mdl`.

| Approach                                                                                                                                                                                | Strengths                                                                                        | Weaknesses                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| A. Embed Dockerfile/compose text in a fence                                                                                                                                             | Zero design                                                                                      | Opaque to DEUS: unhashed tags (`:latest`), no checking |
| B. A container is DEUS data: image pinned by digest (as P2), command, env, ports, volumes, resources; an MDL `container` block is an extension defined in DEUS that lowers to that data | Content-addressed and checked like any definition; the same requirement machinery fetches images | Building images is out of scope                        |
| C. Build OCI images from DEUS (Nix-style)                                                                                                                                               | Fully reproducible                                                                               | Large; needs a builder                                 |

**Choice: B now, C later.** Running a container goes through a `Container` ability handled
by the CLI (it shells out to the host's container runtime), so a function that starts one
shows it in its type. A tag is accepted only together with the digest it resolved to.

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

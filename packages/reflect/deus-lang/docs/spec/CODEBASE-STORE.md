# Codebase store format

A codebase is a directory of plain text files that holds every definition, test, theorem, type, ability,
namespace snapshot, history node and task as a content-addressed object, plus a few mutable pointers and
derived records beside them. The `deus` CLI is the only writer; the CLI, the explorer and the replicator
read it. This spec describes the directory as it is on disk, so that an independent tool can read it or
write objects a `deus` binary accepts. The implementation is in [`deus/codebase.deus`](../../deus/codebase.deus)
(objects, namespaces, history, branches, merge), [`deus/project.deus`](../../deus/project.deus) (the
`project` file and libraries), [`deus/tasks.deus`](../../deus/tasks.deus) (tasks),
[`deus/update.deus`](../../deus/update.deus) (rehashing dependents), [`deus/check.deus`](../../deus/check.deus)
(verdicts), [`deus/replicate.deus`](../../deus/replicate.deus) (remotes) and [`deus/cli.deus`](../../deus/cli.deus)
(commands, provenance, artifacts).

Related specs: the Core terms inside objects are in [CORE.md](./CORE.md); the text export of a codebase is
[CODEBASE-TEXT.md](./CODEBASE-TEXT.md); the bundles pushed to remotes are [CODEBASE-BINARY.md](./CODEBASE-BINARY.md);
spec objects come from [MDL.md](./MDL.md).

## Location

The CLI picks the directory in this order: the `--codebase <dir>` option, then `$DEUS_CODEBASE`, then
`$HOME/.deus`. A directory is a codebase when it contains a file named `HEAD`.

## Layout

```text
<codebase>/
  HEAD                         name of the current branch
  project                      optional: the project IRI and pinned libraries (D49)
  branches/<branch>            causal hash the branch points at
  objects/<h[0..2]>/<h>        every hashed object, one per file
  meta/<h>                     metadata of object <h>; not hashed
  results/<h>                  verdict of test or theorem <h>
  provenance/<causal>          who produced history node <causal>
  remotes/<name>/url           a configured remote
  remotes/<name>/seen/<bundle> what a remote bundle held, so a pull reads it once
  assets/<sha256>              files comments and tasks attach, named by their bytes' SHA-256 (D81)
  exports/<key>                tasks snapshot last exchanged with an export directory (D79)
  artifacts/<key>              built executables and servers; local only
  cache/…                      re-computable data; local only
```

`deus init` creates `objects/`, `meta/`, `branches/`, `results/`, `provenance/` and `cache/`, writes the
empty namespace and the first history node, points `branches/main` at it and writes `HEAD`. Other
directories appear on first use. The store has no magic string and no version file. A reader identifies
a codebase by `HEAD` and each object by its head symbol (see [Objects](#objects)).

All text files are UTF-8. Every file the store writes ends with one `\n`, except the `seen` records, which
have no final newline. Readers SHOULD trim surrounding whitespace from pointer files (`HEAD`,
`branches/*`, `remotes/*/url`) as the CLI does.

## Hashes and object files

An object is one S-expression in the canonical text form of [CORE.md](./CORE.md#text-format): single
spaces, no trailing space, strings escaped the one way the printer allows. Its hash is the lowercase hex
SHA-256 of that text, with no trailing newline:

```text
hash   = hex( sha256( canonical-text(form) ) )      ; 64 lowercase hex digits
path   = "objects/" + hash[0..2] + "/" + hash
file   = canonical-text(form) + "\n"
```

A writer MUST print the form canonically before hashing, because the same form printed two ways gives two
hashes. A reader MAY check that the file text minus its final newline hashes to the file name.

The one exception is a builtin type or ability. Its hash is its IRI, which starts with `#` (`#Bool`,
`#List`, `#IO`; see [CORE.md](./CORE.md#builtin-identities)). It is stored under that name in the same
scheme, so its shard is the first two characters of the IRI:

```text
objects/#B/#Bool    (type "#Bool" 0 (ctor 0) (ctor 0))
objects/#L/#List    (type "#List" 1 (ctor 0) (ctor 2 (tvar 0) (tapp (tref "#List") (tvar 0))))
meta/#Dict          (meta (doc "An immutable hash map with Text or Int keys, built once: O(1) lookups for indexes.") (params "k" "v"))
```

A file under `objects/` never changes once written: the writer skips a path that exists. Readers may
cache objects for the life of a process.

## Objects

The head symbol of an object names its kind, and the kind decides its layer (see [Layers](#layers)).

| Head      | Kind                            | Form                                                                         | Defined in                    |
| --------- | ------------------------------- | ---------------------------------------------------------------------------- | ----------------------------- |
| `term`    | a definition                    | `(term core)`                                                                | [CORE.md](./CORE.md#objects)  |
| `cycle`   | a recursive group of terms      | `(cycle (term …) …)`                                                         | [CORE.md](./CORE.md#objects)  |
| `test`    | a test                          | `(test core)`                                                                | [CORE.md](./CORE.md#objects)  |
| `theorem` | a theorem                       | `(theorem (binders type …) prop (proof "tactic" …))`                         | [CORE.md](./CORE.md#objects)  |
| `type`    | a type                          | `(type "iri" params (ctor arity field-type …) …)`                            | [CORE.md](./CORE.md#objects)  |
| `ability` | an ability                      | `(ability "iri" params (op arity type) …)`                                   | [CORE.md](./CORE.md#objects)  |
| `spec`    | an identified `.mdl` block      | `(spec "block-type" "uri" "id" "title" ("key" "value") …)`                   | [MDL.md](./MDL.md)            |
| `ns`      | a namespace tree node           | `(ns (n "name" entry) … (sub "seg" "h") … \| (part "h") …)`                  | [below](#namespace-snapshots) |
| `causal`  | a history node                  | `(causal (ns "h") (parents "h" …) (msg "text") [(tasks "h")] [(prior "h")])` | [below](#history-nodes)       |
| `record`  | history imported from an export | `(record (entry "causal" "message" "by") …)`                                 | [below](#history-nodes)       |
| `tasks`   | a tasks snapshot                | `(tasks (t "id" (ref "h")) …)`                                               | [below](#tasks)               |
| `task`    | a task                          | `(task (id "…") (title "…") …)`                                              | [below](#tasks)               |

Member `i` of a `cycle` with hash `h` is addressed as `h.i`; a cycle with one member is addressed as `h`.
Only `h` is a file.

A real term, test and theorem from a scratch codebase:

```text
(term (lam (app (prim "Int.add") (var 0) (var 0))))
(test (app (prim "eq") (app (ref "595ca8a5a3d6042d684a1ac6bd7e6900e71f5b2633cf8dca1d6d24ad6edfb09f") (int 2)) (int 4)))
(type "urn:demo:Shape" 0 (ctor 1 (tref "#Int")) (ctor 1 (tref "#Int")))
```

### Dependencies

An object depends on every hash it names in one of these positions; replication, library installs and
the layer check all use this rule ([`Codebase.dependencies`](../../deus/codebase.deus)):

```text
(ref "h")            ; any object, including a task's linked definition and a tasks snapshot entry
(sub "seg" "h")      ; a namespace node's child namespace
(part "h")           ; a namespace node's part
(con "h" …)          ; unless h starts with "#"
(pcon "h" …)         ; unless h starts with "#"
(op "h" …)           ; unless h starts with "#"
(on "h" …)           ; unless h starts with "#"
```

A namespace node reaches its child nodes through `sub` and `part`, but its entries and a history node
name hashes as plain strings, not in these positions; readers that walk history follow `ns`, `parents`,
`tasks` and each entry's hash explicitly.

## Metadata

`meta/<h>` holds what people need to read object `h` but what must not change its hash: doc comments,
signatures as written, binder names, inferred types. The file is `(meta field …)`, printed canonically
plus `\n`. Unlike objects, metadata can be rewritten (an `update` copies a definition's metadata to its
new hash). The fields:

| Field    | Form                           | On                     | Meaning                                                                                                               |
| -------- | ------------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `sig`    | `(sig type)`                   | terms                  | the signature the author wrote                                                                                        |
| `doc`    | `(doc "text")`                 | any definition         | the `/-- … -/` comment                                                                                                |
| `locals` | `(locals "x" …)`               | terms, tests, theorems | binder names, in the order the printer draws them                                                                     |
| `attrs`  | `(attrs ("attr" "value" …) …)` | terms                  | attributes such as `@[ext "<uri>"]` and `@[integration]`                                                              |
| `scheme` | `(scheme type)`                | terms, tests, theorems | the inferred type                                                                                                     |
| `params` | `(params "a" …)`               | types, abilities       | the author's parameter names                                                                                          |
| `fields` | `(fields (c "name" …) …)`      | types                  | constructor field names, one `c` per constructor, `""` unnamed                                                        |
| `lead`   | `(lead "text")`                | any definition         | the ordinary comments written before the declaration (D66)                                                            |
| `notes`  | `(notes (n i "text") …)`       | terms, tests           | comments before a statement or an arm; `i` is the pre-order index of that node among the list nodes of the Core (D66) |

Sample (`meta/595ca8…`, the term above):

```text
(meta (sig (tfun (tref "#Int") (tref "#Int"))) (doc "Doubles a number.") (locals "n") (scheme (tfun (tref "#Int") (tref "#Int") (eff (tvar "r2")))))
```

Readers look fields up by head and MUST ignore fields they do not know. A missing file means no
metadata.

## Namespace snapshots

A namespace maps full names (dot-separated, such as `Demo.Shape.circle`) to entries. A snapshot is a
tree of `ns` nodes, and its hash is the root's hash ([D72](../DECISIONS.md)). A changed name rewrites
only the nodes on its path, so a one-definition commit adds about 6 KB to history in the toolchain's
codebase of 1,392 names, where a flat snapshot added 133 KB.

A node is written from (key, item) pairs:

1. Split each name at its first dot that is neither its first nor its last character: `Demo.Shape.circle`
   is `Shape.circle` under `Demo`. A name with no such dot is an item `(n "name" entry)` keyed by name.
2. The names under each first segment become a child node, written recursively. Each child is an item
   `(sub "segment" "child-hash")` keyed by the segment.
3. Order the items: `n` items by name, then `sub` items by segment. Names and segments compare by UTF-16
   code unit, as JavaScript compares strings, so `Demo.Shape` sorts before `Demo.double`.
4. If there are at most 64 items, the node is `(ns item …)`. Otherwise group the items by the hex digit
   of `sha256(key)` at the node's depth (0 at first), write each group as a node at depth + 1 by this
   step, and make the node `(ns (part "h") …)` with one part per digit, in digit order. A node at depth
   64 does not split.

A reader expands `part` items in place and prefixes the names under a `sub` item with its segment and a
dot. A reader MUST also accept a flat snapshot, one `ns` node holding full names, which codebases wrote
before D72; `deus migrate` rewrites such history into trees.

```text
node     = "(ns" { " (n " string " " entry ")" } { " (sub " string " " hash ")" } ")"
         | "(ns" { " (part " hash ")" } ")"
entry    = "(term " hash ")"
         | "(test " hash ")"
         | "(theorem " hash ")"
         | "(spec " hash ")"
         | "(type " hash " " iri " (" [ string { " " string } ] "))"   ; field names of a structure
         | "(ability " hash " " iri ")"
         | "(ctor " type-hash " " tag " " arity ")"
         | "(op " ability-hash " " index " " arity ")"
```

Hashes and IRIs are strings. `tag`, `index` and `arity` are integers. The `type` entry's third item is a
bare list of field-name strings, empty for an inductive type. A constructor and an operation name their
type's or ability's hash. Several names may share a hash (aliases). Sample, the `Demo` node and the
`Shape` node under it:

```text
(ns (n "Shape" (type "8f4c54219803442bdfd9b5040affc510aa6b1209ba9f317e0d651ceffcd9cf06" "urn:demo:Shape" ())) (n "double" (term "595ca8a5a3d6042d684a1ac6bd7e6900e71f5b2633cf8dca1d6d24ad6edfb09f")) (sub "Shape" "<hash of the node below>"))
(ns (n "circle" (ctor "8f4c54219803442bdfd9b5040affc510aa6b1209ba9f317e0d651ceffcd9cf06" 0 1)))
```

The empty namespace is `(ns)`, hash `f126eadc463e81d2636be4aa0384edbe2aee5690395678593e789ce423bda595`.
A reader that meets an entry head it does not know MUST stop: the CLI raises a defect
(`unknown entry …`), because guessing would change what names mean.

Names starting with `lib.<name>.` are library mounts (see [Projects and libraries](#projects-and-libraries)).

## History nodes

A history node (a causal node) records a namespace snapshot, its parents, a message and, optionally, a
tasks snapshot:

```text
causal = "(causal (ns " hash ") (parents" { " " hash } ") (msg " string ")" [ " (tasks " hash ")" ] [ " (prior " hash ")" ] [ " (comments " hash ")" ] ")"
```

| Field      | Meaning                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------- |
| `ns`       | hash of the namespace snapshot                                                                    |
| `parents`  | zero parents for the first node, one for an ordinary change, two (ours, theirs) for a merge       |
| `msg`      | why the change was made                                                                           |
| `tasks`    | hash of the tasks snapshot; omitted when there are no tasks ([D59](../DECISIONS.md))              |
| `prior`    | hash of a `record` of history imported from an export; omitted otherwise ([D67](../DECISIONS.md)) |
| `comments` | hash of the comments snapshot; omitted when there are no comments ([D81](../DECISIONS.md))        |

A writer MUST omit `(tasks …)` when the branch has no tasks, so a node without tasks hashes as it did
before tasks existed. Readers find fields by head and treat a missing field as empty.

`deus init` always writes the same first node, so every codebase starts from the same hash:

```text
(causal (ns "f126eadc463e81d2636be4aa0384edbe2aee5690395678593e789ce423bda595") (parents) (msg "init"))
```

A node with tasks, from a scratch codebase:

```text
(causal (ns "34098d0262d33ff3efc3253e3799d03fcefd8a7d30fee9f0cf1841d183005e05") (parents "7ccced84c1a5af3a2d1d91364d5232dd2f56915878d5eb26f42a8e8bcc414ae5") (msg "task: open fc205a15 Make double faster") (tasks "a9113feb72873d2eb86b9e2443897268e6c2aa1b8b6d4468d1776cac1d442d1d"))
```

A commit writes a new snapshot and a new node only when something changed: a change whose snapshot hash
equals the parent's leaves the branch where it was. A code change keeps the parent's tasks hash; a task
change keeps the parent's namespace hash.

History may be shallow. A remote collected by the retention GC that D73 removed ([D54](../DECISIONS.md)),
or a pull cut short, leaves nodes that name parents the store does not have; readers MUST treat those parents as absent, so such a node acts as a root. "First-parent
history" (`deus log`, `HISTORY.md`) follows the first parent the store has.

A `record` holds history that this store never had as nodes: the first-parent history of the codebase an
export came from, newest first, one `(entry causal message by)` per change, where `by` is the agent or
`""`. `deus history import` writes it and a node naming it in `(prior …)`, with the parent's namespace
and tasks. `deus log` and the export print the live first-parent history, then each record's entries in
the order the nodes carrying them appear. An entry's causal hash names a node of the original store, so
it is a label: readers MUST NOT follow it. A record is in the history layer.

## Branches and HEAD

`branches/<branch>` holds one causal hash and `\n`. `HEAD` holds the current branch name and `\n`; an
unreadable `HEAD` reads as `main`. A valid branch name is non-empty and uses only ASCII letters,
digits, `-`, `_` and `.`. The same rule applies to remote names.

| Command         | Effect on pointers                                                                                                    |
| --------------- | --------------------------------------------------------------------------------------------------------------------- |
| `branch <name>` | writes `branches/<name>` with the current head and switches `HEAD` to it                                              |
| `switch <name>` | rewrites `HEAD`; the branch must exist                                                                                |
| `undo`          | moves the branch to its first parent; the undone node stays in `objects/`                                             |
| `merge <other>` | moves the current branch (see [Merge](#merge))                                                                        |
| `pull <remote>` | writes tracking branches `<remote>.<branch>`, and `<remote>.<branch>.2`, `.3`, … when the remote has concurrent heads |

## Merge

`deus merge <other>` merges `branches/<other>` into the current branch. Let _ours_ and _theirs_ be the two
heads.

1. If they are equal, or _theirs_ is an ancestor of _ours_: up to date; nothing is written.
2. If _ours_ is an ancestor of _theirs_: fast-forward; the current branch now points at _theirs_.
3. Otherwise the base is the first of _theirs_' ancestors, walked breadth first, that _ours_ also has. With
   no common ancestor, the base namespace and tasks are empty.

For every name in the base, ours or theirs, with `b`, `o`, `t` the entry or its absence on each side:

| Case                           | Result                                      |
| ------------------------------ | ------------------------------------------- |
| `o == t`                       | keep ours                                   |
| `b == o` (only theirs changed) | take `t` (remove the name if `t` is absent) |
| `b == t` (only ours changed)   | keep ours                                   |
| otherwise                      | conflict on the name                        |

Tasks merge by id in the same way. A task changed on both sides merges field by field: `title`, `state`,
`priority`, `assignee`, `parent` and `details` take the side that changed them and conflict when both
changed them differently; `labels` and `links` merge as sets (an item stays if both kept it or the base
lacked it); `comments` are ours followed by theirs' comments that ours lacks. A task added on both sides
is merged against a blank base task. A task removed on one side and changed on the other conflicts as a
whole.

Conflicts are reported as names, then `task:<id>.<field>` (or `task:<id>`). On any conflict no snapshot,
history node or pointer is written, though merged task objects may already be in `objects/`. Without
conflicts the merge writes the merged namespace snapshot, the merged tasks snapshot, and a node with
parents `(ours theirs)` and message `merge <other> into <branch>`, then moves the current branch to it.

## Layers

Every object belongs to a layer, which is a function of its head ([D26, D48](../DECISIONS.md)). Hashed
layers share `objects/`; derived layers have their own directories, so a policy such as "replicate" or
"delete" is a directory.

| Layer        | Holds                               | Lives in      | May depend on                        |
| ------------ | ----------------------------------- | ------------- | ------------------------------------ |
| `code`       | `term`, `cycle`, `type`, `ability`  | `objects/`    | `code`                               |
| `spec`       | `spec`                              | `objects/`    | `spec`                               |
| `tests`      | `test`                              | `objects/`    | `code`, `tests`                      |
| `proofs`     | `theorem`                           | `objects/`    | `code`, `proofs`                     |
| `history`    | `ns`, `causal`, `tasks`, `comments` | `objects/`    | `code`, `tests`, `proofs`, `history` |
| `tasks`      | `task`, `thread`                    | `objects/`    | `code`, `tests`, `proofs`, `history` |
| `results`    | verdicts                            | `results/`    |                                      |
| `provenance` | change records                      | `provenance/` |                                      |
| `assets`     | attached files, by SHA-256          | `assets/`     |                                      |
| `artifacts`  | built executables                   | `artifacts/`  |                                      |
| `cache`      | fetched and generated files         | `cache/`      |                                      |

`deus add` and `deus update` refuse a batch in which an object depends on an object of a layer its own
layer may not depend on, listing each crossing as `name (layer) -> name (layer)`.

`artifacts/` and `cache/` are local only and may be deleted at any time.

Note: [`Codebase.layers`](../../deus/codebase.deus) marks `results` and `provenance` as replicated, but
bundles ([`deus/replicate.deus`](../../deus/replicate.deus)) carry only objects, metadata and branch
claims, so neither directory leaves the machine today. `meta/` is not listed as a layer but is
replicated with its object.

## Results

`results/<h>` holds the verdict for test or theorem `h`, keyed by the hash of what was checked, so
unchanged code is never rechecked ([`deus/check.deus`](../../deus/check.deus)):

```text
verdict = "(pass " string " " int ")"     ; evidence, cases checked
        | "(fail " string ")"             ; the reason, with a stack of "    at <hash>" lines for a defect
```

```text
(pass "test" 1)
(fail "rfl needs a closed proposition (no binders); use decide or test")
```

Evidence is `test` for a test or a theorem checked on generated cases, `rfl`, `decide`, `proof` (proved
by the prover in [`deus/prove.deus`](../../deus/prove.deus)) or `proof assuming tested lemmas`. Readers MUST
accept other evidence strings. `unchecked` is never written; a missing file means unchecked, and an unreadable form reads as
unchecked. `--integration` test runs neither read nor write results. A tool may delete `results/` to force
rechecking.

## Provenance

`provenance/<causal>` records who or what produced a history node. `add`, `update` (including the task
node that `--closes` writes) and the `task` subcommands that change a task write it when given
`--by <agent>`; `task import` does not:

```text
provenance = "(provenance (by " string ") (at " string ")" [ " (prompt " string ")" ] " (objects" { " " string } "))"
```

| Field     | Meaning                                                                               |
| --------- | ------------------------------------------------------------------------------------- |
| `by`      | the agent or person                                                                   |
| `at`      | wall-clock time as decimal nanoseconds since the Unix epoch, as text                  |
| `prompt`  | SHA-256 of the file given with `--prompt`                                             |
| `objects` | hashes the change wrote: the batch's objects and spec objects; empty for task changes |

```text
(provenance (by "claude") (at "1792000823502509000") (prompt "df29e168787ede203fa876f75aaedbcda0b9b135038f63bd00c2b64ff29060af") (objects "8f4c5421…" "1818c20f…" "92aa4a6b…" "595ca8a5…"))
```

Provenance is not hashed and does not affect the history node. `deus log` and `HISTORY.md` show `by`.

## Tasks

Tasks are issues stored as objects ([D59](../DECISIONS.md), [`deus/tasks.deus`](../../deus/tasks.deus)).
A task is a `task` object; the set of tasks on a branch is a `tasks` snapshot that maps task ids to task
hashes, and each history node points at one.

```text
task = "(task (id " string ") (title " string ") (state " state ") (priority " int ")"
       " (assignee " string ") (labels" { " " string } ") (parent " string ") (details " string ")"
       " (links" { " " link } ") (comments" { " " comment } "))"
comment = "(comment " author " " note [ " (at " string ")" ] [ " (assets" { " " asset } ")" ] ")"
asset = "(asset " sha256 " " media-type " " file-name ")"
state = "\"todo\"" | "\"doing\"" | "\"done\"" | "\"canceled\""
link  = "(def " name " (ref " hash "))"       ; a definition, by name and the hash it had when linked
      | "(change " causal-hash ")"            ; a change
tasks = "(tasks" { " (t " id " (ref " hash "))" } ")"   ; sorted by id
```

All fields are always written, in the order above. `priority` is 0 none, 1 urgent, 2 high, 3 medium,
4 low. `parent` is a task id or `""`. A comment is `(comment author note)`, plus `(at …)` when its time is
known (RFC 3339, or nanoseconds since the epoch) and `(assets …)` when it attaches files; a comment
without either prints as before they existed, so older task objects keep their hashes. Links and comments keep the
order they were added in. Readers look fields up by head, default a missing text field to `""`, a missing
priority to 0, a missing list to empty, and an unknown state to `todo`; a malformed link or comment is an
error.

```text
(task (id "fc205a15") (title "Make double faster") (state "todo") (priority 2) (assignee "") (labels "perf" "demo") (parent "") (details "") (links (def "Demo.double" (ref "595ca8a5a3d6042d684a1ac6bd7e6900e71f5b2633cf8dca1d6d24ad6edfb09f"))) (comments))
(tasks (t "fc205a15" (ref "bf91316c2472331e4ae92110c27dd7249880d89060cdfec401eec3fcb32d229d")))
```

A task id is the first 8 hex digits of `sha256(title "\n" author "\n" wall-clock-ns "\n" branch-head)`,
taken when the task is created. Ids are unique within a snapshot; commands accept a unique id prefix.
Linked hashes appear as `(ref …)`, so replication keeps the version of a definition a task was about.
An empty tasks snapshot is never written: the node omits `(tasks …)`. A task's own history is not
stored; it is found by walking the branch and comparing tasks snapshots.

## Comments

Comments on definitions and changes ([D81](../DECISIONS.md), [`deus/comments.deus`](../../deus/comments.deus))
are kept as tasks are: a history node may point at a `comments` snapshot that maps a subject to the hash of
its `thread`.

```text
comments = "(comments" { " (s " subject " (ref " hash "))" } ")"   ; sorted by subject
thread   = "(thread" { " " comment } ")"                          ; oldest first
subject  = "\"def:" name "\"" | "\"change:" causal-hash "\""
```

A definition's subject is its name, so its comments follow it across edits. A task keeps its own
comments; it has no subject. An empty comments snapshot is never written: the node omits `(comments …)`
and keeps the hash it had before comments existed. A change to comments keeps the parent's namespace and
tasks. A merge keeps each subject's thread from the side that changed it; when both did, it keeps ours
and appends theirs' comments that ours lacks, so comments never conflict.

## Assets

An asset is a file a comment attaches, such as a screenshot. The store keeps its bytes at
`assets/<sha256>`, named by the SHA-256 of the bytes; a comment names it as `(asset sha256 media-type
file-name)`. Objects never hold an asset's bytes, so bundles and the git export (`deus export`) stay text
and small; remotes carry assets as separate files ([CODEBASE-BINARY.md](./CODEBASE-BINARY.md#remote-layout)).
`deus asset add <file>` and `--attach <file>` on `deus comment` and `deus task` copy a file in; the
kernel reads only text, so the CLI hashes and copies the bytes with `sha256sum` (or `shasum -a 256`) and
`cp`.

## Projects and libraries

The optional file `project` names the codebase's project and pins its libraries
([D49](../DECISIONS.md)):

```text
project = "(project (iri " string ")" { " (lib " name " " iri " " causal-hash ")" } ")"
```

```text
(project (iri "https://example.org/demo") (lib "math" "https://example.org/mathlib" "67c7d5a614b378f4ec980ba1804d6f656d73975b9feafc119fcf4bf620e16601"))
```

`deus lib install <name> <codebase>` reads the other codebase's branch head (the release), copies every
object its non-`lib.` names reach (with metadata) into this store, replaces all `lib.<name>.*` names with
that release's names under the `lib.<name>.` prefix, rewrites the `project` file with the library first,
and commits. Objects deduplicate by hash.

The project's own subgraph is not stored: it is the hashes reachable from non-`lib.` names minus those
reachable from `lib.` names. On `add`, a type or ability whose IRI equals a library's IRI or lies under it
(`<iri>/…` or `<iri>#…`) is refused unless its name is under `lib.`.

## Update propagation

`deus update` rebinds names to new hashes, then rewrites every term, test and theorem that depends,
directly or not, on a replaced hash: each gets its hash strings replaced, is re-hashed (recursive groups
as cycles, exactly as `add` hashes them), written as a new object, and its name is rebound. Metadata is
copied to the new hash. Old objects stay. All of this lands in one new history node
([`deus/update.deus`](../../deus/update.deus)).

## Remotes, artifacts and cache

| Path                                                            | Content                                                                     |
| --------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `remotes/<name>/url`                                            | a directory path or `r2://<bucket>/<prefix>`, then `\n`                     |
| `remotes/<name>/seen/<bundle>`                                  | `(seen (branch "b" "causal") … (hashes "h" …))`, no final newline           |
| `artifacts/<key>`                                               | `deus build` output, keyed by SHA-256 of the image and the toolchain inputs |
| `artifacts/server-<sha>`                                        | native server for `deus serve`, keyed by SHA-256 of its image               |
| `artifacts/site-server-<sha>`                                   | the explorer's server, keyed the same way                                   |
| `cache/fetch/`                                                  | external tools fetched and verified by hash                                 |
| `cache/site`, `cache/site-<remote>`, `cache/site-<remote>.sums` | generated explorer pages and what was published                             |
| `cache/remote-<name>.curl`                                      | request settings for an R2 remote                                           |

Bundles themselves live on the remote, not in the store; their format is in
[CODEBASE-BINARY.md](./CODEBASE-BINARY.md).

## Concurrency and immutability

- Objects are immutable and named by content, so two writers that write the same object write the same
  bytes. A writer skips an existing path. Files are written in place, not through a rename, so a crash can
  leave a truncated object; a reader that verifies the hash detects it.
- `meta/`, `results/` and `provenance/` are overwritten freely; their content is derived or advisory.
- `HEAD`, `branches/*` and `project` are the only mutable state that changes meaning. The CLI takes no
  lock: two processes committing to one branch at once race, and the last pointer write wins. The losing
  node stays in `objects/` and can be merged back by hash. Run one writer per branch at a time.
- Nothing in the store is ever deleted by normal commands. `undo`, `rm` and rebinding a name leave every
  object in place.

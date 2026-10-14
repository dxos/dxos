# Codebase text export format

The text export is a directory of source files, task records and Markdown that holds the current branch
of a codebase in a form git can diff and people can review ([D64](../DECISIONS.md)). `deus export <dir>`
writes it; `deus add <dir>/code` and `deus task import <dir>/tasks.sexp` read it back into a fresh
codebase with the same names, hashes and tasks. The writer is [`deus/export.deus`](../../deus/export.deus);
definitions are printed by [`deus/print.deus`](../../deus/print.deus) and
[`deus/view.deus`](../../deus/view.deus) through `Cli.viewEntryWith` in [`deus/cli.deus`](../../deus/cli.deus);
tasks are encoded by [`deus/tasks.deus`](../../deus/tasks.deus). The toolchain's own export is checked in at
[`codebase/`](../../codebase/).

Related specs: the store being exported is [CODEBASE-STORE.md](./CODEBASE-STORE.md); the source language the
`code/` files are written in is [LANGUAGE.md](./LANGUAGE.md); Core terms are [CORE.md](./CORE.md).

## Layout

```text
<dir>/
  README.md            what the export is and how to restore it
  code/<Top>.deus      source of every exported definition whose name starts with <Top>.
  code/_root.deus      source of every exported definition whose name has no dot
  specs/<doc>.mdl      the identified spec blocks of each document, with its Extensions table
  tasks.sexp           every task on the branch, one object per line
  TASKS.md             the tasks, for reading
  history.sexp         the branch's history, one entry per line, for `deus history import`
  HISTORY.md           the same history, for reading
```

The export covers the current branch (`HEAD`). It has no version marker; the format is identified by
this layout. `deus export` writes these files and overwrites them if present. It does not delete other
files, so a `code/<Top>.deus` whose namespace has gone stays behind; empty `<dir>/code` before exporting
when that matters. All files are UTF-8 and end with `\n`.

The export leaves out what can be recomputed or is local: `results/`, `artifacts/`, `cache/`, metadata
that the printed source does not carry, and the store's objects and hashes themselves. See
[What does not round-trip](#what-does-not-round-trip).

## code/

### Which entries are written

Each name in the current namespace snapshot whose entry is a `term`, `test`, `theorem`, `type` or
`ability` is printed. Constructors and operations are not printed on their own: they come with their
type's or ability's declaration. A term that is a field accessor of a structure is not printed either,
because the `structure` declaration defines it. `spec` entries and `lib.<name>.` mounts get no special
treatment: spec entries are skipped, and library names are printed like any other names (in
`code/lib.deus`).

### Files and order

The file for a name is its first dot-separated segment (`Codebase.objectPath` goes to `code/Codebase.deus`);
a name without a dot goes to `code/_root.deus`. Inside a file, definitions appear in the order of their
full names, compared by UTF-16 code unit (so `Demo.Shape` precedes `Demo.double`). Definitions are
separated by one blank line, and the file ends with one `\n`:

```text
file = definition { "\n\n" definition } "\n"
```

Each definition is what `deus view <name>` prints, minus every line that starts with `-- ` (the view's
header lines `-- <name> #<hash>` and `-- : <type>`). There are no `namespace … end` blocks and no `open`
lines: every declaration carries its full name.

### How a definition is printed

| Entry     | Printed as                                                                                                                                          |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `term`    | `[/-- doc -/\n]def <name> <params> [: <result>] := <body>`, or equations                                                                            |
| `test`    | `test <name> := <expr>`                                                                                                                             |
| `theorem` | `theorem <name> (x : T) … : <prop> := by <tactic …>` or `:= sorry`                                                                                  |
| `type`    | `structure <name> <params> [@"iri"] where` + `  field : T` lines, or `inductive <name> <params> [@"iri"] where` + `  \| ctor (field : T) T …` lines |
| `ability` | `ability <name> <params> [@"iri"] where` + `  op : T` lines                                                                                         |

Real output for a small namespace:

```text
inductive Demo.Shape @"urn:demo:Shape" where
  | circle (radius : Int)
  | square (side : Int)

/-- Doubles a number. -/
def Demo.double (n : Int) : Int := n + n

theorem Demo.double_even (n : Int) : double n == n + n := by rfl

test Demo.double_two := double 2 == 4
```

The printer turns Core back into source with these rules, which together make the text compile to the
same objects:

- **Names of references.** A reference prints as the shortest suffix of its full name, of at least one
  segment, that no other name in the namespace ends with; constructors and operations keep at least two
  segments (`Option.some`, `Prices.priceOf`). A reference whose short name a local binder shadows prints
  under its full name. A definition's references to itself print under the name being printed, not an
  alias. A reference with no name prints as `#` and the first 10 hash digits, which does not compile;
  a complete namespace has none.
- **Binder names.** Locals take the author's names from the `locals` metadata, in the order the printer
  meets binders, made unique against the names in scope by appending `1`, `2`, …. Without a stored name a
  binder is `x0`, `x1`, …; an unused generated lambda parameter prints as `_`.
- **Signatures.** A term's parameters and result type come from its `sig` metadata. A parameter whose
  stored type is the unknown `?` prints bare. Types and abilities take parameter and field names from
  their `params` and `fields` metadata, or `a`, `b`, … that the declaration does not already use.
- **IRIs.** A type or ability prints `@"iri"` unless its IRI is `urn:deus:<full name>`, the default.
- **Equations.** A term whose body is a `match` on all its parameters (one parameter, or their tuple in
  order) and whose parameters have no stored names prints as `def <name> : <sig>` followed by
  `| pat, … => body` arms at column 0.
- **Sugar.** The primitives `Int.add`, `Int.sub`, `Int.mul`, `Int.div`, `Int.mod`, `eq`, `neq`, `lt`, `le`,
  `gt`, `ge` and `append` print infix (`+ - * / % == != < <= > >= ++`) when applied to two arguments.
  `if a then b else false` prints `a && b` and `if a then true else b` prints `a || b` when neither side is
  a block. Lists of `cons` cells ending in `nil` print `[a, b]`; pairs print `(a, b)`; `Int.neg x` prints
  `-x`; a structure accessor applied to a value prints `v.field` when the field name belongs to one
  structure only. `if b then false else true` is not printed as `not b`, because `not` is an ordinary
  function and would compile to a call ([D63](../DECISIONS.md)).
- **Blocks.** `let`, `seq`, `letrec`, `match` and `handle` bodies go on following lines, indented by two
  spaces per level.
- **Strings** print in double quotes with `\"`, `\\`, `\n`, `\t`, `\r`, and `\u{…}` for other control
  characters; everything else is literal.

### Line width

The printer keeps lines within 100 columns where it has a place to break ([D63](../DECISIONS.md)):

- An application whose first line would pass column 100, and that has two or more arguments, prints the
  function and then each argument on its own line, indented two more spaces.
- A chain of one infix operator that would pass column 100 breaks after the operator, with the right side
  on the next line, indented two more spaces.
- Binder names are drawn while text is made, so a one-line attempt that is abandoned is undone before the
  broken form is printed. The broken form therefore uses the same names.

Nothing else breaks: declaration headers, list literals, one-argument applications, `if` conditions,
string literals and doc comments keep their length. Lines past 100 columns are normal in an export (the
checked-in `codebase/code/` has several hundred), and readers MUST accept lines of any length.

A definition may call a term that no name binds any more (its name was removed or moved). The export
names each such term `Unnamed.h<first 10 hex of its hash>` and exports it under that name, so every
reference prints as a name the parser reads back ([D77](../DECISIONS.md)).

## tasks.sexp

One `task` object per line, in the canonical S-expression form, sorted by task id. The form is the stored
object exactly, so `sha256` of a line (without its `\n`) is the task's object hash:

```text
tasks-file = { task "\n" }
task       = "(task (id " string ") (title " string ") (state " state ") (priority " int ")"
             " (assignee " string ") (labels" { " " string } ") (parent " string ") (details " string ")"
             " (links" { " " link } ") (comments" { " (comment " string " " string ")" } "))"
state      = "\"todo\"" | "\"doing\"" | "\"done\"" | "\"canceled\""
link       = "(def " string " (ref " hash "))" | "(change " hash ")"
```

| Field      | Meaning                                                                               |
| ---------- | ------------------------------------------------------------------------------------- |
| `id`       | 8 hex digits, unique on the branch                                                    |
| `title`    | one line                                                                              |
| `state`    | `todo`, `doing`, `done` or `canceled`                                                 |
| `priority` | 0 none, 1 urgent, 2 high, 3 medium, 4 low                                             |
| `assignee` | free text, `""` for none                                                              |
| `labels`   | strings, in the order given                                                           |
| `parent`   | a task id, or `""`                                                                    |
| `details`  | free text; newlines are escaped as `\n`                                               |
| `links`    | a definition by full name and the hash it had when linked, or a change by causal hash |
| `comments` | `(comment author note)`, oldest first                                                 |

```text
(task (id "fc205a15") (title "Make double faster") (state "doing") (priority 2) (assignee "") (labels "perf" "demo") (parent "") (details "") (links (def "Demo.double" (ref "595ca8a5a3d6042d684a1ac6bd7e6900e71f5b2633cf8dca1d6d24ad6edfb09f"))) (comments (comment "bob" "looks easy")))
```

`deus task import` reads every top-level form in the file, decodes each as a task with the store's rules
(fields found by head; missing text is `""`, missing priority 0, missing lists empty, an unknown state
`todo`), and merges them into the branch as one change with message `task: import from <path>`.
Linked hashes and change hashes are kept as they are, even when the target codebase does not have them.

## Several codebases, one export

An export directory is often shared: each container restores from it, works, and exports back
([D79](../DECISIONS.md)). So neither side overwrites the other:

- The codebase keeps, per export directory, the tasks snapshot it last exchanged with it, in
  `exports/<key>` (`key` is the first 16 hex characters of the SHA-256 of the directory's absolute
  path). It holds one line: the snapshot's object hash.
- `deus task import <dir>/tasks.sexp`, and `deus export <dir>` before it writes, merge the file's tasks
  three-way: base is that snapshot (empty when there is none), ours is the branch's, theirs is the
  file's. Before merging, a task the file lacks, or holds at a version this branch's first-parent
  history has had, takes this codebase's version in theirs: tasks are never deleted, and such a
  file comes from a writer that had not seen the newer version. The merge is the branch merge's,
  field by field. A field both sides changed keeps this
  codebase's value and prints `conflict: <task>.<field>` on stderr. A change is committed only when the
  result differs from ours. The file's snapshot then becomes the base.
- `deus export <dir>` also reads `<dir>/history.sexp` first. Entries whose causal hash `deus log` does
  not list are kept as a `record` under a node with message `export: merge <n> changes from <dir>`, so
  the history it writes includes the other codebase's changes. `deus log` lists a causal hash once,
  even when several records hold it.
- After writing, the export records the branch's tasks snapshot as the base.
- In git, `history.sexp`, `tasks.sexp` and `HISTORY.md` merge with `merge=union`
  ([D85](../DECISIONS.md)). A union can leave a task on two lines; the reader keeps the version the
  branch has never had, else the later line.

Code is not merged: `code/` is the exporting branch's, as before. Share code through a remote; the
export directory merges only tasks and history.

## TASKS.md

For reading only; nothing parses it. It starts with `# Tasks` and a blank line. Tasks follow in this
order: open tasks (`todo`, `doing`) before closed ones, then by priority with "none" last, then by title.
Each task is:

```text
"## " title " (`" id "`)\n\n"
"- state: " state "\n"
"- priority: " none|urgent|high|medium|low "\n"
[ "- assignee: " assignee "\n" ]
[ "- labels: " label { ", " label } "\n" ]
[ "- parent: " parent "\n" ]
{ "- links `" name "` (#" hash[0..10] ")\n" | "- links change #" hash[0..10] "\n" }
[ "\n" details "\n" ]
{ "\n> " author ": " note "\n" }
"\n"
```

Bracketed lines appear only when the field is non-empty. Details and notes are written as they are, so a
multi-line note continues outside the `>` quote.

## history.sexp

The branch's history as `deus log` prints it, newest first: the live first-parent chain, then the entries
of every imported `record` ([CODEBASE-STORE.md](./CODEBASE-STORE.md#history-nodes)). One object per
line:

```text
"(entry " string(causal) " " string(message) " " string(by) ")\n"
```

`by` comes from the node's provenance record, or the imported entry, and is `""` when unknown. The walk
follows the first parent the store has, so a shallow store ([D54](../DECISIONS.md)) ends early. Merged
branches appear only as their merge node.

## HISTORY.md

For reading only. It starts with `# History of <branch>` and a blank line, then one line per entry of
`history.sexp`, in the same order:

```text
"- `" causal[0..10] "` " message [ " (by " by ")" ] "\n"
```

## README.md

Fixed text, except three parts. The title is the project IRI from the store's `project` file, or
`a DEUS codebase` when there is none. The `deus project init` line appears only when there is a project.
`specs` follows `deus add code` only when the export wrote spec documents. For the toolchain:

````text
# https://dxos.org/deus/toolchain

A text export of a DEUS codebase (`deus export`, D64), kept in git as its backup. It is
generated: change the codebase, then export again.

- `code/` holds the source of every definition, one file per top-level namespace.
- `tasks.sexp` holds the tasks, and `TASKS.md` lists them to read.
- `history.sexp` holds the branch's changes, and `HISTORY.md` lists them to read.
- `specs/` holds the `.mdl` spec blocks, one document per name.

To restore it into a fresh codebase:

```bash
deus init --empty
deus project init https://dxos.org/deus/toolchain
deus add code specs
deus task import tasks.sexp
deus history import history.sexp
```
````

## Restoring

From inside the export directory:

```bash
deus init --empty          # no builtins or prelude: code/ already holds them
deus project init <iri>    # only when the README names a project
deus add code specs        # every .deus and .mdl file, sorted, as one batch (specs/ only if present)
deus task import tasks.sexp
deus history import history.sexp
```

`deus add` compiles all files as one batch, so definitions may refer to each other across files and in
any order. The result:

- The namespace snapshot has the same names bound to the same hashes, so its `ns` object has the same
  hash as the exported branch's snapshot.
- The tasks snapshot holds the same task objects, so it has the same hash too.
- History is not replayed. The restored branch has its own nodes (`init`, the add, the two imports), so
  its causal hashes differ from the original. The last import keeps the original history as a `record`
  ([D67](../DECISIONS.md)), so `deus log` and the next export list the restore's nodes and then every
  change before it.

`src/cli.test.ts` checks this: after export and restore, `deus ls --json` and
`deus task list --all --json` print the same output for both codebases. A second check
([D63](../DECISIONS.md)) prints every definition of the toolchain, updates them all back, and expects
`Nothing changed.`

## What does not round-trip

Hashes do not depend on any of these, so they do not break the guarantee above, but a restored codebase
lacks them:

- Ordinary `--` comments: they are not stored at all.
- Doc comments of types, abilities, tests and theorems: only a term's `/-- … -/` is printed.
- Attributes (`@[ext "<uri>"]`, `@[integration]`): they live in metadata and the printer does not print
  them, so after a restore `deus mdl` finds no extensions and integration tests run as ordinary tests.
- Spec entries (`.mdl` blocks): they are not exported.
- The `project` file: the project IRI appears only as the README title, and library pins are lost.
  `lib.<name>.` names are restored as ordinary names under that prefix.
- Verdicts, provenance, branches other than the current one, and remotes.

Note: [`deus/print.deus`](../../deus/print.deus) writes a control character other than `\n`, `\t` and `\r`
as `\u{` and its code in decimal, but the lexer reads the digits inside `\u{…}` as hexadecimal. A string
literal holding such a character (ESC, code 27, prints `\u{27}`, which reads back as `'`) therefore
compiles back to a different hash. Codes 0 to 9 are unaffected. Until the printer writes hex, a definition
with such a literal does not round-trip.

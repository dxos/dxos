# CLI JSON output format

Every `deus` command that reports a result prints it as one JSON document on stdout when `--json` is
given, so an agent can drive the CLI without parsing text ([LLM.md](../LLM.md)). The CLI writes it; agents
and scripts read it. The commands are in [`deus/cli.deus`](../../deus/cli.deus) (each passes its JSON to
`output`), `test` and `check` are in [`deus/check.deus`](../../deus/check.deus), and the printer is
[`deus/json.deus`](../../deus/json.deus). This spec gives the rendering rules, one schema per command, and
the exit codes. The codebase objects these documents describe are in [CODEBASE-STORE.md](./CODEBASE-STORE.md).

## Output contract

- With `--json`, a successful command prints exactly one JSON document followed by `\n` on stdout, and
  nothing else on stdout. The text form is printed instead without `--json`.
- Errors are never JSON. A failing command prints `deus: <message>` on stderr and exits 1, with nothing
  on stdout. `--json` does not change this.
- `add` and `update` may print `warning: <text>` lines on stderr before the document.
- A few commands print the document and then exit non-zero: `test`, `check` and `mdl` when something
  failed, and `merge` on conflicts. A reader should parse stdout whenever it is non-empty.
- `--json` takes no value and may appear anywhere among the arguments.

There is no version field. Fields appear in the order listed below; a reader should not depend on order
and should ignore fields it does not know.

## JSON rendering

The printer emits compact JSON with no whitespace.

| DEUS value | JSON                                                                    |
| ---------- | ----------------------------------------------------------------------- |
| null       | `null`                                                                  |
| bool       | `true` / `false`                                                        |
| number     | a 32-bit signed integer in decimal; there are no fractions or exponents |
| string     | `"…"`, escaped as below                                                 |
| array      | `[a,b]`                                                                 |
| object     | `{"k":v,…}`, keys in the order the code gives them, never duplicated    |

In strings, `"` is `\"`, `\` is `\\`, U+000A is `\n`, U+0009 `\t`, U+000D `\r`, and every other code
unit below U+0020 is `\u` followed by 4 lowercase hex digits (so U+0008 is `\u0008`, not `\b`). Everything
else, non-ASCII included, is written literally as UTF-8.

## Shared shapes

```text
entry   = {"name": string, "kind": kind, "hash": string}
kind    = "term" | "type" | "ability" | "ctor" | "op" | "test" | "theorem" | "spec"
task    = {"id", "title", "state", "priority", "assignee", "labels", "parent", "details", "links", "comments"}
change  = {"causal": string, "message": string, "by"?: string}
```

A hash is 64 lowercase hex characters, except builtins (`#Bool`, `#IO` …) and members of a recursive group
(`<hash>.<i>`), as in [CORE.md](./CORE.md). A constructor's or operation's `hash` is its type's or
ability's. `by` appears when the change was recorded with `--by <agent>`.

A `task` has the fields of the explorer's task object without `history`
([EXPLORER.md](./EXPLORER.md#tasksjson)): `state` is `todo`, `doing`, `done` or `canceled`; `priority` is
0 (none) to 4 (low); a link is `{"definition": name, "hash": hash}` or `{"change": causal}`; a comment is
`{"author", "note"}`.

## Commands

### Codebase

| Command                    | Document                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `init`                     | `{"codebase": dir, "branch": "main", "library": bool}`; `library` is whether builtins and prelude were added |
| `add`, `update`            | `{"added": entry[], "updated": entry[], "propagated": name[], "causal": hash}`                               |
| `ls [prefix]`, `find text` | `entry[]`, sorted by name                                                                                    |
| `names <name>`             | `{"hash": hash, "names": name[]}`                                                                            |
| `view <name…>`             | `[{"name", "kind", "hash", "source"}]`, one per argument, in order                                           |
| `deps <name>`              | `{"name": name, "dependencies": [{"hash", "name"}]}`                                                         |
| `dependents <name>`        | `{"name": name, "dependents": [{"hash", "name"}]}`                                                           |
| `mv`, `alias`              | `entry[]`: the new names                                                                                     |
| `rm <name…>`               | `name[]`: the names removed                                                                                  |

In `add` and `update`, `updated` lists names that now point at a new hash (with that hash) and
`propagated` the dependents that were rehashed because of them. `view`'s `source` is the text `deus view`
prints, header comments included (`-- <name> #<hash prefix>`, `-- : <type>`); with `--core` it is the
stored Core instead, and with `--dialect ts` the TypeScript-like dialect, whose header lines start with
`// ` ([DIALECT-TS.md](./DIALECT-TS.md)). In `deps` and `dependents`, `name` is the hash's name, or `#` and its first 10
characters when the namespace has none.

```json
{
  "added": [],
  "updated": [
    {
      "name": "Demo.double",
      "kind": "term",
      "hash": "79c651ce3028658d9e9f070b0ca72e7558b7e5639d90c18d8dae2596233aa841"
    }
  ],
  "propagated": ["Demo.bad", "Demo.doubleTwo"],
  "causal": "3ba0464907f808bff7155569b727673219cd638a31ca724e386806aed456f76e"
}
```

### History

| Command          | Document                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------- |
| `branch`         | `{"current": branch, "branches": branch[]}`                                                 |
| `branch <name>`  | `{"branch": name}`                                                                          |
| `switch <name>`  | `{"branch": name}`                                                                          |
| `merge <branch>` | one of the four objects below                                                               |
| `log [--n N]`    | `[{"causal", "message", "parents": hash[], "by"?}]`, newest first, `N` (default 20) entries |
| `undo`           | `{"causal": hash}`: the node the branch now points at                                       |
| `layers`         | `[{"layer", "path", "replicated": bool, "entries": number}]`                                |

```text
{"result":"up-to-date"}
{"result":"fast-forward","causal":hash}
{"result":"merged","causal":hash,"changed":name[]}
{"result":"conflicts","names":name[]}                      exit code 1; nothing is written
```

A conflict name is a definition name, or `task:<id>.<field>` for a task field changed differently on both
sides. `layers` lists the layers in a fixed order: `spec`, `code`, `tests`, `proofs`, `history`, `tasks`
(all with `path` `objects/`), `results`, `provenance`, `artifacts`, `cache`.

### Projects

| Command                         | Document                                                                                                        |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `project`                       | `{"project": iri, "authority": iri, "owned": number, "fromLibs": number, "libs": [{"name", "iri", "release"}]}` |
| `project init <iri>`            | `{"project": iri}`                                                                                              |
| `lib install <name> <codebase>` | `{"lib": name, "iri": iri, "release": hash, "causal": hash}`                                                    |

### Replication

| Command                   | Document                                     |
| ------------------------- | -------------------------------------------- |
| `remote`                  | `[{"remote": name, "url": url}]`             |
| `remote add <name> <url>` | `{"remote": name, "url": url}`               |
| `push [remote]`           | `{"bundle": name\|null, "site"?: number}`    |
| `pull [remote]`           | `[{"branch": name, "heads": hash[]}]`        |
| `compact [remote]`        | `{"written": bundle[], "deleted": bundle[]}` |

`push` gives `bundle` `null` when the remote already had everything. `site` is present when the remote
hosts the explorer and the current branch was pushed: the number of site files uploaded
([EXPLORER.md](./EXPLORER.md#publishing)). In `pull`, a branch with more than one head received concurrent
pushes. Bundle names are described in [CODEBASE-BINARY.md](./CODEBASE-BINARY.md).

```json
{ "bundle": "0-fd66a8551696c81296fb7308fa28fe8873915d2ad0d2c5741b88cc5a8342c9cb", "site": 0 }
```

### Running and checking

| Command                 | Document                                                                          |
| ----------------------- | --------------------------------------------------------------------------------- |
| `eval <expr>`           | `{"value": string}`: the value printed as source                                  |
| `test [prefix]`         | `result[]`, sorted by name                                                        |
| `check [prefix]`        | `result[]`, sorted by name                                                        |
| `mdl [files…]`          | `[{"block": place, "status": "ok"\|"fail"\|"unchecked", "problems": string[]}]`   |
| `build <name> -o <out>` | `{"binary": out}`, with or without `--native`, `--server`, `--worker` or `--wasm` |
| `explore --out <dir>`   | `{"definitions": number, "out": dir}`                                             |
| `explore --publish <r>` | `{"definitions": number, "remote": r, "files": number, "uploaded": number}`       |

A `test` or `check` result is one of:

```text
{"name": name, "cached": bool, "status": "pass", "evidence": evidence, "cases": number}
{"name": name, "cached": bool, "status": "fail", "reason": string}
{"name": name, "cached": bool, "status": "unchecked"}
```

`cached` is true when the verdict came from `results/` without running. `evidence` is `test` or
`integration` for tests, and `rfl`, `decide`, `test`, `proof` or `proof assuming tested lemmas` for
theorems. A `reason` for a defect is `defect: <message>` followed by `\n    at <name>` per stack frame
([OBSERVABILITY.md](./OBSERVABILITY.md#defects)). `unchecked` is a theorem proved by `sorry`. The command
exits 1 when any result is `fail`.

```json
[
  { "name": "Demo.bad", "cached": false, "status": "fail", "reason": "returned false" },
  { "name": "Demo.doubleTwo", "cached": false, "status": "pass", "evidence": "test", "cases": 1 }
]
```

In `mdl`, `place` is `<path>:<line> <block description>` for a file, or the spec's name when checking
the codebase's specs, and the command exits 1 when any block failed ([MDL.md](./MDL.md)).

### Tasks

| Command                                          | Document                                                                          |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| `task`, `task list …`                            | `task[]`, open first, then by priority and title                                  |
| `task new …`, `set`, `comment`, `link`, `unlink` | `task`: the task as saved                                                         |
| `task show <id>`                                 | `{"task": task, "links": link-report[], "history": change[], "children": task[]}` |
| `task import <file>`                             | `{"imported": number}`                                                            |
| `export <dir>`                                   | `{"files": number, "definitions": number, "tasks": number}`                       |

In `task show`, a link report for a change is `{"change": hash, "message": string}`; for a definition it is
`{"definition": name, "hash": hash, "current": hash|null, "changes": change[]}`, where `current` is the
name's hash now and `changes` the history nodes that rebound the name, newest first.

```json
{
  "id": "e0757e4e",
  "title": "Double overflows",
  "state": "todo",
  "priority": 2,
  "assignee": "",
  "labels": ["bug"],
  "parent": "",
  "details": "",
  "links": [
    { "definition": "Demo.double", "hash": "595ca8a5a3d6042d684a1ac6bd7e6900e71f5b2633cf8dca1d6d24ad6edfb09f" }
  ],
  "comments": []
}
```

### Commands without JSON

`compile` and `image` write an image ([IMAGE.md](./IMAGE.md)) to `-o <file>` or to stdout. `run` prints
what the program prints, with telemetry on stderr ([OBSERVABILITY.md](./OBSERVABILITY.md)). `serve` and
`explore` without `--out` or `--publish` run a server until stopped. `help`, or no command, prints the
usage text. `--json` has no effect on these.

## Exit codes

| Code  | Meaning                                                                                                   |
| ----- | --------------------------------------------------------------------------------------------------------- |
| 0     | success                                                                                                   |
| 1     | a command error (`deus: <message>` on stderr), a failed test, theorem or MDL block, or merge conflicts    |
| 70    | a defect: in the program under `deus run`, or an uncaught one in the CLI itself                           |
| 71    | a kernel panic, such as a malformed image                                                                 |
| 2     | the native kernel could not read its image file                                                           |
| other | `deus run` passes on the program's `IO.exit` code; `serve` and `explore` pass on their server's exit code |

Under `deus run`, a defect prints `defect: <message>` and its stack on stderr
([OBSERVABILITY.md](./OBSERVABILITY.md#defects)). A panic prints `panic: <message>`.

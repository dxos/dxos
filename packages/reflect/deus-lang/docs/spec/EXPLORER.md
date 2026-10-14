# Explorer site format

`deus explore` writes the current branch of a codebase as a static site: a single-page app and the JSON
files it reads ([D58](../DECISIONS.md), [D62](../DECISIONS.md), [D72](../DECISIONS.md)). The writer is
[`deus/explorer.deus`](../../deus/explorer.deus); the uploader is `publishSite` in
[`deus/cli.deus`](../../deus/cli.deus). Readers are the app in [`platform/explorer/`](../../platform/explorer)
(`app.js`), which any static file server can host: the native server running
[`platform/site.deus`](../../platform/site.deus), a bucket, or the Worker in
[`platform/explorer-worker/`](../../platform/explorer-worker). The JSON files are also a convenient read-only
view of a codebase for other tools. This spec gives the layout, each file's schema, and how a site is
published to a remote. The codebase it is generated from is described in [CODEBASE-STORE.md](./CODEBASE-STORE.md).

## Layout

```text
<site>/
  index.html, app.js, app.css     the app, copied unchanged from $DEUS_HOME/platform/explorer/
  meta.json                       the project, branches, counts and recent history
  names.json                      every visible name
  tasks.json                      every task, with links resolved and its history
  def/<page>.json                 one per visible definition
  change/<causal>.json            one per history node the app links to
```

A definition's `<page>` is its hash, except that a builtin's `#` becomes `_` (`#Bool` is `def/_Bool.json`),
since a URL path cannot carry a `#` and no hex hash starts with `_`.

`<site>` is `--out <dir>`, or `<codebase>/cache/site` by default. Generation overwrites `meta.json`,
`names.json`, `tasks.json`, the app files and every `def/` file of the current namespace. It never deletes
a file, so `def/` and `change/` keep pages from earlier runs; nothing links to them. A `change/` file that
already exists is not rewritten, since a history node never changes.

All JSON files are compact (no whitespace), UTF-8, written by the CLI's JSON printer
([CLI-JSON.md](./CLI-JSON.md#json-rendering)). Hashes are full 64-character SHA-256 hex, except builtin
types and abilities, whose hash is their `#` IRI (`#Bool`), and members of a recursive group, written
`<hash>.<i>` ([CORE.md](./CORE.md)). There is no version field; a reader should ignore fields it does not
know.

A name is **visible** unless it names a constructor or an ability operation (kinds `ctor` and `op`), which
share their type's or ability's hash. Visible kinds are `term`, `type`, `ability`, `test`, `theorem` and
`spec`.

## Shared shapes

```text
ref     = {"name": string, "hash": string}
change  = {"causal": string, "message": string, "by"?: string}
```

`by` is present when the change has a provenance record (`--by <agent>`).

## meta.json

| Field         | Type     | Content                                                           |
| ------------- | -------- | ----------------------------------------------------------------- |
| `project`     | string   | the project IRI, or `"codebase"` when the codebase has no project |
| `branch`      | string   | the branch the site shows                                         |
| `branches`    | string[] | every local branch                                                |
| `definitions` | number   | how many visible names                                            |
| `tasks`       | number   | how many tasks                                                    |
| `open`        | number   | how many tasks are `todo` or `doing`                              |
| `history`     | change[] | the branch's 30 most recent history nodes, newest first           |

```json
{"project":"codebase","branch":"main","branches":["main"],"definitions":246,"tasks":1,"open":1,"history":[{"causal":"01702deda26c0eafc3175496093fb0cc829422fa99d08e2cbd9b4de750d5c0b9","message":"task: open e0757e4e Double overflows","by":"agent-x"},…]}
```

## names.json

An array with one object per visible name, sorted by name. The app lists, searches and previews names
from this file alone, without opening their pages.

| Field     | Type   | Content                                                                       |
| --------- | ------ | ----------------------------------------------------------------------------- |
| `name`    | string | the full name                                                                 |
| `kind`    | string | one of the visible kinds above                                                |
| `hash`    | string | its hash                                                                      |
| `sig`     | string | its type scheme, as in `def`'s `signature` without the name, or `""`          |
| `summary` | string | the first line of its doc comment, or `""`                                    |
| `status`  | string | `pass` or `fail` from the cached verdict of a test or theorem, otherwise `""` |

```json
[{"name":"Bool","kind":"type","hash":"#Bool","sig":"","summary":"","status":""},{"name":"Code.cost","kind":"term","hash":"40a9c644c4cb0d1f8803e325159ea0318bf3ce481b4852cbbf5289458b8ec88e","sig":"Code -> Int","summary":"","status":""},…]
```

## `def/<page>.json`

One file per distinct hash among visible names. When several visible names share a hash, each writes the
same file in name order, so the file carries the alphabetically last of them in `name` and the others in
`aliases`.

| Field       | Type         | Content                                                                                                                |
| ----------- | ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `name`      | string       | the definition's full name                                                                                             |
| `kind`      | string       | its kind                                                                                                               |
| `hash`      | string       | its hash; the file name is its page                                                                                    |
| `aliases`   | string[]     | every other name bound to the hash, constructors and operations included                                               |
| `signature` | string       | `<last name segment> : <type scheme>`, or `""` when the metadata has no scheme                                         |
| `doc`       | string\|null | the doc comment                                                                                                        |
| `html`      | string       | the source as `deus view` prints it, without its `-- ` header lines, as highlighted HTML                               |
| `ts`        | string       | the same in the TypeScript-like dialect ([DIALECT-TS.md](./DIALECT-TS.md)), highlighted                                |
| `deps`      | ref[]        | what the definition refers to, types in its signature included, limited to hashes the namespace names, itself excluded |
| `users`     | ref[]        | visible definitions that refer to it, sorted by hash                                                                   |
| `verdict`   | string       | the cached test or theorem verdict, or `""`; see below                                                                 |
| `tasks`     | object[]     | `{"id","title","state"}` of each task linked to the name or the hash                                                   |

In `deps` and `users`, `name` is the hash's name in the namespace, or `#` and its first 10 characters when
it has none.

`html` uses `<span class=K>` around each run of kind `K`: `kw` (keyword), `ty` (a capitalized name), `str`
(a string literal) and `cm` (a comment). Plain text is unwrapped. `&`, `<`, `>` and `"` are escaped. A name
that refers to one of `deps` is wrapped in `<a class=ref data-open="d:<hash>">…</a>`.

`verdict` is the text of `<codebase>/results/<hash>` with surrounding whitespace removed: an S-expression
`(pass "<evidence>" <cases>)` or `(fail "<reason>")` ([CODEBASE-STORE.md](./CODEBASE-STORE.md)). It is
`""` when the definition was never checked.

```json
{
  "name": "Demo.doubleTwo",
  "kind": "test",
  "hash": "1818c20fe03940d1b73e6dedb46bebd93cc7804501a10bf186854e56ec25a48d",
  "aliases": [],
  "signature": "doubleTwo : Bool",
  "doc": null,
  "html": "<span class=kw>test</span> <span class=ty>Demo.doubleTwo</span> := <a class=ref data-open=\"d:595ca8a5a3d6042d684a1ac6bd7e6900e71f5b2633cf8dca1d6d24ad6edfb09f\">double</a> 2 == 4",
  "deps": [{ "name": "Demo.double", "hash": "595ca8a5a3d6042d684a1ac6bd7e6900e71f5b2633cf8dca1d6d24ad6edfb09f" }],
  "users": [],
  "verdict": "(pass \"test\" 1)",
  "tasks": []
}
```

`deps` counts every hash the definition's object or its type scheme names: terms, constructors, operations
and types, builtins included. So `Bool`'s `users` lists everything that takes or returns a `Bool`, which
`deus dependents` (the update-propagation graph) does not.

## tasks.json

An array of every task, open tasks first, then by priority (urgent, high, medium, low, none) and title.

| Field      | Type     | Content                                                                    |
| ---------- | -------- | -------------------------------------------------------------------------- |
| `id`       | string   | 8 hex characters                                                           |
| `title`    | string   |                                                                            |
| `state`    | string   | `todo`, `doing`, `done` or `canceled`                                      |
| `priority` | number   | 0 none, 1 urgent, 2 high, 3 medium, 4 low                                  |
| `assignee` | string   | `""` when unassigned                                                       |
| `labels`   | string[] |                                                                            |
| `parent`   | string   | the parent task's id, or `""`                                              |
| `details`  | string   |                                                                            |
| `links`    | object[] | see below                                                                  |
| `comments` | object[] | `{"author","note"}`, oldest first                                          |
| `history`  | change[] | the changes that touched the task, newest first, from the last 200 changes |

A link is either a definition or a change:

```text
{"definition": name, "hash": hash-when-linked, "current": hash|null}
{"change": causal, "message": string}
```

`current` is the hash the name has now, `null` when the name no longer exists. `message` is `""` when the
history node is not in the store.

```json
[
  {
    "id": "e0757e4e",
    "title": "Double overflows",
    "state": "todo",
    "priority": 2,
    "assignee": "",
    "labels": ["bug"],
    "parent": "",
    "details": "",
    "links": [{ "definition": "Demo.double", "hash": "595ca8a5…", "current": "595ca8a5…" }],
    "comments": [],
    "history": [{ "causal": "01702ded…", "message": "task: open e0757e4e Double overflows", "by": "agent-x" }]
  }
]
```

## `change/<causal>.json`

Written for each history node in `meta.json`'s `history` and in any task's `history`. It compares the node
with its first parent (an empty namespace for a root node).

| Field     | Type     | Content                                                                            |
| --------- | -------- | ---------------------------------------------------------------------------------- |
| `causal`  | string   | the node's hash                                                                    |
| `message` | string   | its message                                                                        |
| `parents` | string[] | its parents                                                                        |
| `added`   | ref[]    | visible names new in this node, with their hash then                               |
| `changed` | object[] | `{"name","from","hash","before","after"}`: visible names bound to a different hash |
| `removed` | string[] | visible names no longer bound                                                      |
| `tasks`   | string[] | ids of tasks whose record differs from the parent's                                |
| `by`      | string   | optional, as in `change`                                                           |

```json
{
  "causal": "01702deda26c0eafc3175496093fb0cc829422fa99d08e2cbd9b4de750d5c0b9",
  "message": "task: open e0757e4e Double overflows",
  "parents": ["e1632acd31577c16263fbda37c2f62f06e3a434ca76bc7ee3307a7b1bf7c143a"],
  "added": [],
  "changed": [],
  "removed": [],
  "tasks": ["e0757e4e"],
  "by": "agent-x"
}
```

`before` and `after` are the name's source in the parent and in the node, printed as for `html` but as plain
text, so the app can show the change as a line diff. Pages written before these fields existed lack them,
and the app then shows only the two hashes.

Hashes in a change page are those of that moment; `def/` files exist only for current hashes, so the app
opens a name's current page.

## App state in the URL

The app keeps its open cards in the URL fragment as a comma-separated list, in the order they are shown, and
the view when it is not the code workspace:

```text
fragment = key ("," key)*
key      = "d:" hash | "n:" namespace | "t:" task-id | "c:" causal | "v:" ("tasks" | "history")
```

For example `index.html#d:595ca8a5…,n:List,t:e0757e4e`. A card opened from another card goes right after it;
one opened from the tree or the finder goes after the focused card. Keys that do not match `^[dtcnv]:.` are
ignored, and an empty fragment shows the overview. Which card has focus, which are folded, and the tree's
open namespaces are not kept; the source dialect (DEUS or TS) is kept per viewer in `localStorage`.

## Serving

Any static file server works if it maps `/` to `index.html`, serves the files under their paths and
percent-decodes request paths. The bundled server gives `.html` `text/html; charset=utf-8`, `.json`
`application/json`, `.css` `text/css`, `.js` `text/javascript`, `.svg`
`image/svg+xml`, and other files `text/plain; charset=utf-8`. With no `--out` or `--publish`, `deus explore` starts it on `--port` (default
8080).

The Worker in `platform/explorer-worker/` proxies a published site: it maps `/` to `/index.html`, fetches
`ORIGIN + path` (ignoring the query), and caches successful responses for 60 seconds with
`cache-control: public, max-age=60`.

## Publishing

`deus explore --publish <remote>` generates the site in `<codebase>/cache/site`, then uploads the files
that changed to the remote, under `site/` beside its bundles ([CODEBASE-BINARY.md](./CODEBASE-BINARY.md)):

| Remote                   | A file `<path>` goes to                           |
| ------------------------ | ------------------------------------------------- |
| a directory `<dir>`      | `<dir>/site/<path>`                               |
| `r2://<bucket>/<prefix>` | `$DEUS_R2_ENDPOINT/<bucket>/<prefix>/site/<path>` |

Uploads are incremental. The manifest `<codebase>/cache/site-<remote>.sums` records the last upload, one
line per file:

```text
manifest = { sha256-hex " " path "\n" }
```

A file is uploaded when its SHA-256 differs from the manifest's or it is missing there; `--force` ignores
the manifest. After the upload, the manifest is rewritten with every file of the site. Files are never
deleted from the remote. A bucket upload runs one `curl --parallel --parallel-max 16` with a signed `PUT`
per file and the content type the bundled server uses (`Replicate.siteType`): a browser refuses a module
script or a stylesheet sent as `text/plain`, and the Worker passes the type on.

The manifest's existence marks a remote as hosting the explorer. Each `deus push <remote>` of the current
branch then regenerates the site in `<codebase>/cache/site-<remote>` and publishes the changes the same
way ([CLI-JSON.md](./CLI-JSON.md)).

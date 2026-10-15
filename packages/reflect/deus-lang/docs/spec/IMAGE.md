# Image format

An image is the complete, self-contained program a kernel runs: the closure of one entry definition as
[Core](./CORE.md) text, plus the entry's hash. The DEUS toolchain writes images ([`deus/image.deus`](../../deus/image.deus),
used by `deus image`, `deus compile`, `deus build` and `deus serve`). The TypeScript kernel
([`src/kernel/run.ts`](../../src/kernel/run.ts)) and the Rust kernel ([`../deus-kernel/src/run.rs`](../../../deus-kernel/src/run.rs),
[`../deus-kernel/src/embed.rs`](../../../deus-kernel/src/embed.rs)) read them. The toolchain itself ships as the image
`seed/deus.image`. This page also specifies the executables that carry an image
([`deus/build.deus`](../../deus/build.deus)).

## Text

An image is UTF-8 text, one canonical Core form per line, each line ended by `\n`:

```text
image    = { def "\n" } { nominal "\n" } main "\n"
def      = "(def " string " " core ")"
nominal  = "(type " string " " string ")" | "(ability " string " " string ")"
main     = "(main " string ")"
```

- **`(def "h" core)`**: definition `h` and its runnable Core. For a term or test object this is the object's
  `core`. For a theorem it is the `prop`, the Core function that states it. Forms are printed canonically
  ([CORE.md](./CORE.md#canonical-printing)).
- **`(type "h" "iri")` and `(ability "h" "iri")`**: the IRI of each user type and ability the definitions
  construct, match or perform ([D43](../DECISIONS.md)). A definition names a type by the hash of its shape; an
  embedder names it by its stable IRI, and these lines map one to the other. Builtins (`#…`) are not listed.
- **`(main "h")`**: the entry definition.

Example, `deus image Demo.main` (lines shortened):

```text
(def "4a817947…cb7f" (lam (match (var 0) (case (pcon "ac15a694…3b25" 0 (pvar)) …))))
(def "9716255f…5729" (lam (let (text "a\"b\n") (app (op "#IO" 0 1) …))))
(def "ec6b0096…569a" (prim "Int.toText"))
(ability "85e1d1e2…b60f" "urn:deus:Demo.Ask")
(type "ac15a694…3b25" "urn:deus:Demo.Shape")
(main "9716255f…5729")
```

### Determinism

The same entry MUST yield the same bytes, so an image can be cached and compared by hash
([Artifacts cache](#artifacts-cache)) and the seed can reproduce itself.

- The `def` lines are exactly the definitions reachable from `main` through `(ref "h")`, each once, sorted by hash
  in ordinal (code unit) order. A cycle member such as `6f06….0` sorts as text.
- The nominal lines list each hash that appears as the first argument of `con`, `pcon` or `op` in any `def` and
  does not start with `#`, sorted by hash and without duplicates. A hash is listed only when its object is a
  `type` or `ability`; the `type`/`ability` head comes from that object. Types used only in signatures are not
  listed.
- There are no comments, no blank lines, and exactly one `main` line, last.

A writer that cannot find a reachable definition MUST fail (`missing definition #h`) rather than write a partial
image.

## Loading and running

A kernel runs an image as follows:

1. Read every form ([CORE.md](./CORE.md#reading)). Malformed text is a panic: `panic: malformed image: …`, exit 71.
2. Find the first top-level `(main "h")`. Without one: `panic: malformed image: no (main "hash") form`, exit 71.
3. Register each `(def "h" core)`. If a hash appears twice, the first wins. Definitions are compiled lazily, on
   first reference, so an unused malformed definition is not detected.
4. The Rust kernel records each `(type …)` and `(ability …)` line as a hash-to-IRI map, for embedding. The
   TypeScript kernel ignores them. Both kernels ignore any other top-level form.
5. Evaluate `main` applied to the unit value. The exit code follows [CORE.md](./CORE.md#failure): 0 when `main`
   returns, `n` for `IO.exit n`, 70 for a defect, 71 for a panic.

There is no version or magic string in the image text. A reader MUST NOT reject an image for an unknown top-level
form, so new kinds of lines can be added without breaking existing kernels.

Runs read these environment variables:

| Variable         | Effect                                                                  |
| ---------------- | ----------------------------------------------------------------------- |
| `DEUS_MAX_STEPS` | a defect once this many machine steps have run                          |
| `DEUS_TRACE`     | report the most recently referenced definitions with a defect           |
| `DEUS_PROFILE`   | print entries per definition to stderr after a successful run           |
| `DEUS_JIT=0`     | TypeScript kernel only: run everything on the machine, no compiled code |

Embedders load the same text through `deus_start`, which can call any definition, not only `main`, with a JSON
argument ([EMBEDDING.md](./EMBEDDING.md)).

## The seed

`seed/deus.image` is the image of `Cli.main`, compiled from every file in `deus/`:

```text
node bin/deus.mjs compile deus --main Cli.main -o seed/deus.image
```

`deus` on the command line is the seed run by a kernel with the command-line arguments: `bin/deus.mjs` runs
[`src/kernel/main.ts`](../../src/kernel/main.ts), and the native `deus-kernel` runs the seed when its executable
carries no image ([Native executable](#native-executable)). `DEUS_SEED` names another image to run instead.
Compiling `deus/` with the seed MUST reproduce the seed byte for byte (`src/seed.test.ts`); see
[D17](../DECISIONS.md).

## Executables

`deus build <term> -o <out>` packages the term's image (`term` applied to `()` is `main`). Each target carries
the image text unchanged.

| Flag        | Output                                      | Decision                                       |
| ----------- | ------------------------------------------- | ---------------------------------------------- |
| (none)      | a Node single-executable application        | [D38](../DECISIONS.md), [D53](../DECISIONS.md) |
| `--native`  | the Rust kernel with the image appended     | [D42](../DECISIONS.md)                         |
| `--server`  | the Rust kernel with a web handler appended | [D57](../DECISIONS.md)                         |
| `--worker`  | a directory for a Cloudflare Worker         | [D45](../DECISIONS.md), [D57](../DECISIONS.md) |
| `--browser` | a directory holding a static web page       | [D78](../DECISIONS.md)                         |
| `--wasm`    | a WebAssembly module compiled from Core     | see [WASM.md](./WASM.md)                       |

### Native executable

The native and server targets append the image to a copy of the `deus-kernel` binary, followed by a text
trailer:

```text
file    = kernel-bytes image-bytes length marker
length  = 20 ASCII decimal digits, zero-padded   ; byte length of image-bytes
marker  = "DEUSIMG1"                             ; run the image
        | "DEUSSRV1"                             ; serve the image as a web handler
```

`image-bytes` is the image text as UTF-8. The trailer is text so that DEUS code writes it with `IO.appendFile`.

On start, the kernel reads its own executable (`current_exe`) and checks the last 8 bytes:

- `DEUSIMG1`: it parses the 20 digits before the marker as the length, takes that many bytes before the digits as
  the image, and runs it with the process arguments (without the program name).
- `DEUSSRV1`: it takes the image the same way and serves HTTP on `$PORT` (default 8080), keeping per-object
  storage under `$DEUS_DATA` (default `./deus-data`). The image's `main` is the handler.
- Anything else, or a length longer than the file: there is no embedded image, and the kernel runs the seed
  (`$DEUS_SEED`, or the seed next to the source tree it was built from).

Invalid UTF-8 in the image is replaced, not rejected. A future trailer MUST use a new 8-byte marker; a reader
that does not know a marker treats the file as having no image.

### Node single-executable application

The default target is a Node single-executable application ([D38](../DECISIONS.md)). It is built with pinned
tools run through `npx`:

1. `esbuild@0.28.2` bundles [`src/bin/standalone.ts`](../../src/bin/standalone.ts) and the kernel into one CommonJS
   script, `main.cjs`.
2. A SEA config names that script and one asset, `image`, holding the image text:
   `{"main":…,"output":"sea.blob","disableExperimentalSEAWarning":true,"assets":{"image":"deus.image"}}`.
   `node --experimental-sea-config` turns it into `sea.blob`.
3. The Node binary (`$DEUS_NODE`) is copied to `out`. `postject@1.0.0-alpha.6` injects the blob as resource
   `NODE_SEA_BLOB` with fuse `NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`. On macOS the binary is unsigned
   first, the blob goes into segment `NODE_SEA`, and the result is signed ad hoc.

At start, the bundled script reads the asset `image` as UTF-8 and runs it with `process.argv.slice(2)` and the
`DEUS_*` options above. The exit code is the run's.

### Cloudflare Worker

`deus build <actor> -o <dir> --worker` writes a directory ([D45](../DECISIONS.md), [D57](../DECISIONS.md)):

| File               | Content                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| `app.image`        | the actor's image                                                                                           |
| `deus_kernel.wasm` | the Rust kernel built for `wasm32-unknown-unknown`                                                          |
| `kernel.mjs`       | the JavaScript embedder ([`../deus-kernel/embed/kernel.mjs`](../../../deus-kernel/embed/kernel.mjs))        |
| `worker.mjs`       | the Durable Object `DeusActor` ([`../deus-kernel/embed/worker.mjs`](../../../deus-kernel/embed/worker.mjs)) |
| `wrangler.toml`    | the Worker configuration                                                                                    |

`wrangler.toml` is generated as:

```toml
name = "<actor name>"
main = "worker.mjs"
compatibility_date = "2025-01-01"

[[rules]]
type = "Text"
globs = ["**/*.image"]
fallthrough = true

[[durable_objects.bindings]]
name = "ACTOR"
class_name = "DeusActor"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["DeusActor"]
```

The actor name is the term's name in lower case with `.` replaced by `-`. The `Text` rule makes `app.image`
importable as a string. `worker.mjs` imports the image and the wasm module, calls the image's `main` with each
request as a `urn:deus:web:Request` value, and answers the requests the actor leaves unhandled by IRI. Only
`app.image` and the name in `wrangler.toml` depend on the actor.

### Browser page

`deus build <term> -o <dir> --browser` writes a directory any static file server can host
([D78](../DECISIONS.md)):

| File                              | Content                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------- |
| `app.image`                       | the term's image                                                                |
| `kernel-ts.mjs`                   | the TypeScript kernel bundled for browsers by esbuild ([D173](../DECISIONS.md)) |
| `deus_kernel.wasm`, `kernel.mjs`  | the embeddable kernel and its driver, as for the Worker                         |
| `host.mjs`                        | the browser host ([EMBEDDING.md](./EMBEDDING.md#the-browser-host))              |
| `index.html`, `app.js`, `app.css` | the page, copied from [`platform/browser/`](../../platform/browser)             |
| `deus.json`                       | the page's configuration: `{"cwd":"/work","env":{"HOME":"/home"},"files":{}}`   |

The page runs the TypeScript kernel unless `?kernel=wasm` in its URL or `"kernel": "wasm"` in `deus.json`
picks the wasm one. The page is a terminal: each command line is split into words as a POSIX shell splits them and runs the
image's `main` with them as `IO.args`. Beside it, an editor shows and changes the in-memory files.
`deus.json` may also give `hide` (path prefixes left out of the file list), `open` (a file to show)
and `run` (command lines to run on load). [`platform/browser/playground.mjs`](../../platform/browser/playground.mjs)
turns a page built from `Cli.main` into the playground: it adds the builtins and prelude for `deus init`,
a sample program, and with `--codebase <dir>` every file of that codebase under `/codebase`.

Sizes on 2026-10-15:

| Part                                    | Bytes      | Gzipped |
| --------------------------------------- | ---------- | ------- |
| `kernel-ts.mjs`                         | 31,612     | 12 KB   |
| `deus_kernel.wasm`                      | 286,338    | 103 KB  |
| the seed as `app.image`                 | 2,664,786  | 506 KB  |
| the toolchain's codebase in `deus.json` | 35,836,277 | 10.2 MB |

The codebase holds every object of its history, 15,000 files; `playground.mjs` leaves out the local-only
layers (`cache`, `artifacts`, `exports`, `remotes`).

### Artifacts cache

The Node target caches its output in the codebase's artifacts layer ([D53](../DECISIONS.md)), which is local and
never replicated ([CODEBASE-STORE.md](./CODEBASE-STORE.md)):

```text
key  = sha256(image + "\n" + nodeVersion + kernelSums)
path = <codebase>/artifacts/<key>
```

- `nodeVersion` is the stdout of `$DEUS_NODE --version`, newline included.
- `kernelSums` is the stdout of `sha256sum` over `$DEUS_HOME/src/bin/standalone.ts` followed by every
  `$DEUS_HOME/src/kernel/*.ts` that is not a `*.test.ts`, in sorted file-name order. Each line holds an absolute
  path, so the key also depends on where the toolchain is installed.

When `path` exists, the build copies it to `out`. Otherwise it builds `out` and copies it to `path`.

`deus serve <handler>` caches its server at `<codebase>/artifacts/server-<sha256(image)>`, a `DEUSSRV1` executable,
and runs it with `PORT` set. The native, server and worker targets of `deus build` are not cached.

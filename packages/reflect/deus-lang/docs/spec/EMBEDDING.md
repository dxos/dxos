# Embedding format

The embeddable kernel is the Rust kernel compiled for `wasm32-unknown-unknown`. It is a WebAssembly module
with no imports that loads an [image](./IMAGE.md), calls one definition, and hands every operation the
program leaves unhandled back to its embedder as a JSON request. The embedder (a Cloudflare Worker, a
browser page, a Node test) answers each request with a JSON value and the run continues on the same stack
([D43](../DECISIONS.md)). This spec covers the module's exports, how bytes cross the boundary, the JSON
result and value encodings, and the `IO` requests an embedder must be ready to answer. The kernel side is
[`deus-kernel/src/embed.rs`](../../../deus-kernel/src/embed.rs) and
[`deus-kernel/src/json.rs`](../../../deus-kernel/src/json.rs); the reference embedder is
[`deus-kernel/embed/kernel.mjs`](../../../deus-kernel/embed/kernel.mjs), and
[`deus-kernel/embed/worker.mjs`](../../../deus-kernel/embed/worker.mjs) is the Durable Object that
`deus build --worker` ships ([D45](../DECISIONS.md), [D52](../DECISIONS.md)). The platform abilities it
answers are declared in [`platform/web.deus`](../../platform/web.deus).

The WASI build of the same kernel ([D41](../DECISIONS.md)) is a command-line program, not an embedding
interface; it is described at the end. The modules that `deus build --wasm` compiles from Core are a
different thing again: see [WASM.md](./WASM.md).

## Building

```text
cargo build --release --lib --target wasm32-unknown-unknown   # in deus-kernel/
→ target/wasm32-unknown-unknown/release/deus_kernel.wasm      (about 270 KB)
```

The linker sets an 8 MiB stack (`deus-kernel/.cargo/config.toml`), because wasm has no guard page and Core
loading recurses. There is no version string in the module; an embedder pairs a kernel file with the
images it was built to run.

## Exports

The module imports nothing. It exports one memory and six functions. All pointers and lengths are `i32`
(wasm32 `usize`).

| Export                                                         | Signature       | Meaning                                                                    |
| -------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------- |
| `memory`                                                       | memory          | the kernel's linear memory; it grows, so views on it go stale after a call |
| `deus_alloc(len)`                                              | `i32 → i32`     | reserves `len` bytes (at least 1) for input and returns their address      |
| `deus_free(ptr, len)`                                          | `i32 i32 → ()`  | releases a block from `deus_alloc`; `len` must be the value passed to it   |
| `deus_start(image, image_len, entry, entry_len, arg, arg_len)` | `i32 ×6 → i32`  | loads an image and calls an entry; returns the result's byte length        |
| `deus_resume(answer, answer_len)`                              | `i32 i32 → i32` | answers the pending request; returns the result's byte length              |
| `deus_output()`                                                | `→ i32`         | address of the last result                                                 |
| `deus_output_len()`                                            | `→ i32`         | length of the last result (the same number the last call returned)         |

The linker also exports the globals `__data_end` and `__heap_base`. They are not part of the interface.

## Calling convention

Every input is UTF-8 bytes in kernel memory. To pass a string, the embedder calls `deus_alloc(n)`, copies
the `n` bytes to the returned address, passes `(address, n)`, and calls `deus_free(address, n)` once the
call returns. The kernel copies its inputs before it runs, so freeing right after the call is safe.
Invalid UTF-8 is replaced with U+FFFD.

Every result is UTF-8 JSON. `deus_start` and `deus_resume` return its byte length; the bytes are at
`deus_output()`. They stay valid until the next `deus_start` or `deus_resume`. Memory may grow during any
call, so the embedder must take a fresh view of `memory.buffer` after each call.

`deus_start` takes three strings:

| Argument | Content                                                                                            |
| -------- | -------------------------------------------------------------------------------------------------- |
| `image`  | the image text ([IMAGE.md](./IMAGE.md)): `(def …)`, `(type …)`, `(ability …)` and `(main …)` forms |
| `entry`  | the hash of the definition to call; empty means the hash in the image's `(main "hash")` form       |
| `arg`    | one JSON value, decoded as below; the entry is applied to exactly this one argument                |

An entry that takes `Unit` is called with `null`. An entry is always applied to one argument, so a
definition that is not a function fails with a defect.

## Instances and runs

An instance holds at most one machine. `deus_start` builds a fresh machine from the image, replacing the
previous one along with any suspended run. `deus_resume` continues the machine's suspended run. A run that
has finished (any state other than `suspend`) cannot be resumed. To serve several runs that may be
suspended at the same time, an embedder instantiates the module once per concurrent run; the Worker keeps a
pool of idle instances for this ([D52](../DECISIONS.md)).

The embedding kernel has no step budget, no trace and no profile.

## Results

A result is one JSON object whose `state` field says which of five shapes it is. Fields appear in the
order shown; a reader should not depend on the order.

```text
{"state":"done","value":V}
{"state":"suspend","ability":IRI,"hash":H,"op":N,"args":[V,…]}
{"state":"defect","message":S,"trace":[H,…]}
{"state":"panic","message":S}
{"state":"exit","code":N}
```

| State     | Meaning                                                                                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `done`    | the entry returned `value`                                                                                                                                                            |
| `suspend` | the run performed operation `op` (0-based, in declaration order) of an ability no handler in the program catches; `args` are its arguments                                            |
| `defect`  | a defect nothing caught (division by zero, a failed match, `defect "…"`); `trace` lists the definitions it passed through, innermost first                                            |
| `panic`   | the input was malformed or the machine reached an impossible state: an unparsable image, an image with no `(main …)` and an empty `entry`, bad JSON, a `resume` with no suspended run |
| `exit`    | reserved. `IO.exit` suspends like every other operation, so the current kernel never produces this state                                                                              |

In a `suspend` result, `ability` is the ability's IRI when the image has an `(ability "hash" "iri")`
form for it, and otherwise its hash; builtin abilities have IRIs that start with `#`
and are their own hash (`#IO`). `hash` is always the hash. Embedders dispatch on `ability`.

A defect trace holds definition hashes (or the `#…` names of builtins), at most 32, with a tail call
leaving no entry. A tool maps them to names with a codebase, as `deus run` does
([OBSERVABILITY.md](./OBSERVABILITY.md#defects)).

Real results from the test program in [`embed/kernel.test.mjs`](../../../deus-kernel/embed/kernel.test.mjs):

```json
{"state":"suspend","ability":"urn:deus:test:Kv","hash":"2edfb6e96b0dac115ac0b092c21aa417b42a0e97934870a71374e4ad1e330579","op":1,"args":["greeting","hello"]}
{"state":"suspend","ability":"#IO","hash":"#IO","op":0,"args":["stored\n"]}
{"state":"done","value":"hello world"}
{"state":"defect","message":"division by zero","trace":["main"]}
{"state":"panic","message":"resume without a suspended run"}
```

## Answering a request

The embedder answers a `suspend` result by calling `deus_resume` with one JSON value, the operation's
return value encoded as below. An operation returning `Unit` is answered with `null`. There is no error
answer: an embedder that cannot serve a request either answers with a value the program understands (an
`Option`, a status code) or abandons the run. The reference driver:

```js
let result = kernel.start(image, entry, argument);
while (result.state === 'suspend') {
  result = kernel.resume(await handle(result.ability, result.op, result.args));
}
```

Requests arrive in the order the program performs them, one at a time.

## Values as JSON

Values cross in both directions with one encoding.

| DEUS value                                     | JSON                           |
| ---------------------------------------------- | ------------------------------ |
| `Int`                                          | a number                       |
| `Text`                                         | a string                       |
| `Bool`                                         | `true` / `false`               |
| `Unit`                                         | `null`                         |
| `List a`                                       | an array of the elements       |
| any other constructed value                    | `{"$":T,"tag":n,"fields":[…]}` |
| a function, a `Ref` cell, a map, anything else | `{"$fn":true}` (output only)   |

In the object form, `T` names the value's type: the IRI the image declares for it with a
`(type "hash" "iri")` form, otherwise the type's hash. Builtin types use their `#` IRI: `#Option`
(`none` is tag 0, `some` tag 1), `#Pair` (tag 0, two fields). `tag` is the constructor's 0-based index in
its declaration and `fields` its arguments in order. A tuple is nested pairs: `(a, b, c)` is
`{"$":"#Pair","tag":0,"fields":[a,{"$":"#Pair","tag":0,"fields":[b,c]}]}`.

```json
{"$":"urn:deus:test:Point","tag":0,"fields":[1,2]}
{"$":"#Option","tag":1,"fields":["hello"]}
```

An image carries an IRI form for every user type and ability its definitions construct, match or perform
([`deus/image.deus`](../../deus/image.deus)). Every user type and ability has an IRI: the one declared
with `@"iri"` in source, or `urn:deus:<qualified name>` by default ([LANGUAGE.md](./LANGUAGE.md)). So in
practice user values cross by IRI. A type the image does not mention (one that appears only inside a
value the embedder sends) has no IRI form and must be named by hash.

### Output rules

The kernel writes compact JSON with no whitespace. Numbers are 32-bit integers in decimal. Strings are
escaped as follows; everything else, including non-ASCII, is written as UTF-8.

| Character                                | Written as               |
| ---------------------------------------- | ------------------------ |
| `"` and `\`                              | `\"`, `\\`               |
| U+0008, U+000C, U+000A, U+000D, U+0009   | `\b` `\f` `\n` `\r` `\t` |
| other code units below U+0020            | `\u00xx`, lowercase hex  |
| a lone surrogate (DEUS `Text` is UTF-16) | `\udxxx`, lowercase hex  |

### Input rules

The kernel's JSON reader is lenient where a reader of its output never needs it to be strict:

- An input must be exactly one JSON value; trailing non-whitespace is a panic.
- A number is any run of `-+.0-9eE`, parsed as a double, truncated toward zero and wrapped to 32 bits
  (as JavaScript's `x | 0`). Non-finite numbers become 0.
- An object must have a string `"$"`; otherwise the result is a panic
  (`json: an object needs "$" (its constructor's type)`). `"tag"` defaults to 0 and `"fields"` to `[]`.
  Other keys are ignored; with duplicate keys the first wins.
- `"$"` is looked up among the image's IRIs and replaced by the type's hash. A name that is neither an IRI
  of the image nor a known hash is used as given, unchecked. `{"$":"#Bool","tag":1}` is `true`.
- `{"$fn":true}` has no `"$"`, so a function can leave the kernel but never come back.
- A string escape `\uXXXX` is one UTF-16 code unit; an unknown escape such as `\x` stands for the
  character itself.

## IO requests

Nothing in the embedding kernel touches a file system, a clock or a process. Every `#IO` operation the
program performs comes to the embedder as a request, like a user ability. The operations are those of
`ability IO @"#IO"` in [`deus/builtins.deus`](../../deus/builtins.deus), in this order:

| op  | Operation    | `args`                | Answer                                               |
| --- | ------------ | --------------------- | ---------------------------------------------------- |
| 0   | `print`      | `[text]`              | `null`                                               |
| 1   | `eprint`     | `[text]`              | `null`                                               |
| 2   | `readFile`   | `[path]`              | `#Option` of the file's text                         |
| 3   | `writeFile`  | `[path, text]`        | `null`                                               |
| 4   | `exists`     | `[path]`              | boolean                                              |
| 5   | `listDir`    | `[path]`              | array of names, sorted (the native host sorts them)  |
| 6   | `mkdirp`     | `[path]`              | `null`                                               |
| 7   | `remove`     | `[path]`              | `null`                                               |
| 8   | `args`       | `[null]`              | array of strings                                     |
| 9   | `exit`       | `[code]`              | none: the run should be abandoned                    |
| 10  | `time`       | `[null]`              | milliseconds since the run started                   |
| 11  | `readStdin`  | `[null]`              | string                                               |
| 12  | `writeBytes` | `[path, [byte, …]]`   | `null`                                               |
| 13  | `getEnv`     | `[name]`              | `#Option` of the value                               |
| 14  | `isDir`      | `[path]`              | boolean                                              |
| 15  | `wallClock`  | `[null]`              | nanoseconds since the Unix epoch as a decimal string |
| 16  | `appendFile` | `[path, text]`        | `null`                                               |
| 17  | `exec`       | `[program, [arg, …]]` | `(code, stdout, stderr)` as nested `#Pair`s          |

`wallClock` returns text because nanoseconds do not fit a 32-bit `Int` ([D35](../DECISIONS.md)). An
embedder answers only what its programs use; the Worker answers `print`, `eprint` and `wallClock` and
fails the request for anything else.

## The Worker's abilities

`deus build <actor> -o <dir> --worker` writes `app.image`, `deus_kernel.wasm`, `kernel.mjs`, `worker.mjs`
and `wrangler.toml` to `<dir>` ([`deus/build.deus`](../../deus/build.deus)). The Worker calls the image's
`main` with a `urn:deus:web:Request` value (`verb`, `url`, `payload`) and expects a `done` result whose
value is a `urn:deus:web:Response` (`status`, `content`, `headers` as a list of pairs). Any other result
becomes a 500 response whose body is the result's JSON. It answers these requests:

| Ability                | op       | Operation                      | Answer                                         |
| ---------------------- | -------- | ------------------------------ | ---------------------------------------------- |
| `urn:deus:web:Storage` | 0        | `get key`                      | `#Option` of the stored text                   |
| `urn:deus:web:Storage` | 1        | `put key value`                | `null`                                         |
| `urn:deus:web:Storage` | 2        | `delete key`                   | boolean: whether the key existed               |
| `urn:deus:web:Http`    | 0        | `fetch request`                | a `urn:deus:web:Response` (headers left empty) |
| `urn:deus:web:Actors`  | 0        | `call name request`            | the named object's `urn:deus:web:Response`     |
| `urn:deus:web:Alarm`   | 0        | `set milliseconds`             | `null`; later the actor gets `ALARM /alarm`    |
| `#IO`                  | 0, 1, 15 | `print`, `eprint`, `wallClock` | as in the IO table                             |

## The WASI kernel

`cargo build --release --target wasm32-wasip1` builds the same machine as a WASI command
(`deus-kernel.wasm`, about 315 KB, [D41](../DECISIONS.md)). It is not an embedding interface: it runs an
image with command-line arguments exactly as the native `deus-kernel` binary does, by default the
toolchain's seed (so it is a complete `deus` CLI), with `IO` served by WASI. It imports
`wasi_snapshot_preview1` and exports `_start`. Two platform constraints shape how a host must run it:

- WASI has no working directory. The kernel resolves a relative path against `$PWD`, so the host must set
  `PWD` and preopen every directory the program touches. [`deus-kernel/wasi/run.mjs`](../../../deus-kernel/wasi/run.mjs)
  preopens `/` as `/`.
- Node 22's WASI crashes when a garbage collection runs inside a fast API call, so the Node runner
  disables them (`--no-turbo-fast-api-calls`).

`exec` has no process support under WASI and answers exit code 127. The exit code of the module is the
program's: 0, the code given to `IO.exit`, 70 for a defect, 71 for a panic
([CLI-JSON.md](./CLI-JSON.md#exit-codes)).

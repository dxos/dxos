# TypeScript bindings

`deus bindings` writes a TypeScript module that calls DEUS functions with TypeScript values
([D79](../DECISIONS.md)). The module runs them on the embeddable wasm kernel ([EMBEDDING.md](./EMBEDDING.md)),
in Node, a browser or a Worker. TypeScript calls DEUS through the module's functions; DEUS calls TypeScript by
performing an ability whose handler the TypeScript side supplies. The writer is
[`deus/bindings.deus`](../../deus/bindings.deus); the runtime it copies is
[`src/bindings/runtime.ts`](../../src/bindings/runtime.ts); [`examples/geometry.deus`](../../examples/geometry.deus)
and [`src/bindings/bindings.test.ts`](../../src/bindings/bindings.test.ts) are a worked example.

## Output

```text
deus bindings <prefix|name…> -o <dir> [--name <stem>]
```

| File               | Content                                                                       |
| ------------------ | ----------------------------------------------------------------------------- |
| `<stem>.ts`        | types, codecs, handler types, the embedded image and `load`                   |
| `deus-runtime.ts`  | a copy of `src/bindings/runtime.ts`: the kernel driver, built-in codecs, `IO` |
| `deus_kernel.wasm` | the embedding kernel, built with cargo when it is missing                     |

`<stem>` defaults to the first argument's last segment in lower case. A prefix selects every term under it;
a full name selects that term. Field accessors are not exported. The JSON document is in
[CLI-JSON.md](./CLI-JSON.md). Each function that cannot be exported is listed with its reason, on stderr
and in a comment at the top of the module.

## Using a module

```ts
import { readFileSync } from 'node:fs';
import { load } from './out/geometry.ts';

const geometry = await load(readFileSync('./out/deus_kernel.wasm'), {
  Log: { info: (line) => console.log(line) },
  Throw: {
    throw_: (reason) => {
      throw new Error(reason);
    },
  },
});
await geometry.total([{ $tag: 'circle', r: 2 }]); // 12, after Log.info "summing 1 shapes"
```

`load(wasm, handlers, io?)` takes the kernel's bytes or a compiled `WebAssembly.Module`, one handler object per
ability the exported functions perform without handling it, and optional `IO` answers (`print`, `eprint`,
`getEnv`; the defaults print to the console). It returns an object with one async function per export. A call
rejects with `DeusDefect` (message and definition trace) on a defect, and with whatever a handler throws.

Each call takes an idle kernel instance or instantiates one, so calls may overlap and a handler may call back
into the module.

## Types

The TypeScript type of each DEUS type, and the JSON its codec reads and writes:

| DEUS                        | TypeScript                                         | JSON                                      |
| --------------------------- | -------------------------------------------------- | ----------------------------------------- |
| `Int`                       | `number` (32-bit; encoding truncates with `\| 0`)  | a number                                  |
| `Text`                      | `string`                                           | a string                                  |
| `Bool`                      | `boolean`                                          | `true` / `false`                          |
| `Unit`                      | `void`; a `Unit` parameter is left out             | `null`                                    |
| `List a`                    | `ReadonlyArray<A>`                                 | an array                                  |
| `Option a`                  | `A \| undefined`                                   | `#Option`, tag 0 or 1                     |
| `(a, b)`, `(a, b, c)`       | `readonly [A, B]`, `readonly [A, B, C]`            | right-nested `#Pair`s                     |
| `structure P where x : X …` | `type P = { readonly x: X; … }`                    | `{"$": hash, "tag": 0, "fields": [x, …]}` |
| `inductive T` with fields   | `{ readonly $tag: 'ctor'; readonly f: F; … } \| …` | `{"$": hash, "tag": n, "fields": […]}`    |
| `inductive T`, all nullary  | `'red' \| 'green' \| …`                            | `{"$": hash, "tag": n, "fields": []}`     |
| `T a` (a type parameter)    | `T<A>`; the codec is `T$(codecA)`                  | as above                                  |

- A field without a name is `_0`, `_1`, …. A structure's fields come from its namespace entry, an inductive
  type's from its `fields` metadata.
- Names that are not TypeScript identifiers have other characters replaced by `_`; keywords get a trailing
  `_` (`Throw.throw` is `throw_`). A type's TypeScript name is its last segment, or its whole name with `.`
  as `_` when two types share the last segment.
- Values are written with the type's hash as `$`, which the kernel accepts without an IRI form; values read
  are matched by tag against the static type, so `$` is not checked.
- A tuple of four or more items keeps its nesting after the third: `(a, b, c, d)` is `readonly [A, B, readonly [C, D]]`.

Not exported, each with its reason:

- a polymorphic function (a type variable in its signature);
- a parameter or result of function type;
- `Dict`, `Ref`, `MutMap` and other builtin types without a JSON form;
- `Option` of `Unit` or of `Option`, whose `none` and `some undefined` would both be `undefined`;
- a function that performs an ability at different type arguments from an earlier export.

## Abilities

Every ability in the exported functions' effect rows, except the builtins, gets a handler type:

```ts
export type LogHandler = {
  readonly info: (arg0: string) => rt.Awaitable<void>;
};
```

A parameterised ability is typed at the arguments the functions perform it at (`Throw Text` gives
`throw_: (arg0: string) => rt.Awaitable<never>`). An operation whose result is a type variable of its own
(`throw : e -> a`) returns `never`: its handler must throw, and the call rejects with what it threw.
Requests are dispatched by the ability's IRI and, as a fallback, by its hash.

`IO` is answered by the runtime: `print`, `eprint`, `time`, `getEnv` and `wallClock`. Any other `IO`
operation fails the call; files and processes are not available to embedded code.

## Entries

The kernel applies an entry to exactly one value. A function of one parameter is its own entry. For a
constant, or a function of `n ≥ 2` parameters, the image holds an adapter definition, named by the hash of its
`(term …)` form:

```text
(lam (ref "f"))                                                         ; a constant
(lam (match (var 0)                                                     ; n = 3
  (case (pcon "#Pair" 0 (pvar) (pcon "#Pair" 0 (pvar) (pvar)))
    (app (ref "f") (var 2) (var 1) (var 0)))))
```

The module passes the arguments as the right-nested pair the adapter matches (`rt.args`). The image is the
closure of the exported functions plus the adapters, sorted by hash, with the IRI forms of the types and
abilities they use and a `(main …)` naming the first export's entry.

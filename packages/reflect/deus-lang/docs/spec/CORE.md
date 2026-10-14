# Core format

Core is the small language every DEUS definition compiles to. It is the input to hashing, the body of every
codebase object, and the only thing a kernel runs. The compiler ([`deus/compile.deus`](../../deus/compile.deus),
[`deus/resolve.deus`](../../deus/resolve.deus)) writes it; the codebase stores it
([CODEBASE-STORE.md](./CODEBASE-STORE.md)); the two kernels ([`src/kernel/machine.ts`](../../src/kernel/machine.ts)
and [`../deus-kernel/src/machine.rs`](../../../deus-kernel/src/machine.rs)) read and evaluate it. Core is written
as canonical S-expressions, read and printed by [`deus/sexp.deus`](../../deus/sexp.deus),
[`src/kernel/sexp.ts`](../../src/kernel/sexp.ts) and [`../deus-kernel/src/sexp.rs`](../../../deus-kernel/src/sexp.rs).
How definitions are packaged for a kernel is in [IMAGE.md](./IMAGE.md).

## Text encoding

Core text is a sequence of forms. A form is an integer, a symbol, a string or a list.

```text
form     = integer | symbol | string | list
list     = "(" [ form { " " form } ] ")"
integer  = [ "-" ] digit { digit }
symbol   = atomchar { atomchar }            ; and not an integer
string   = '"' { char | escape } '"'
escape   = '\"' | '\\' | '\n' | '\t' | '\r' | '\u' hex hex hex hex
atomchar = any character except space, LF, TAB, CR, "(", ")"
```

Text is a sequence of UTF-16 code units, as DEUS `Text` is. Strings hold code units, not code points.

### Canonical printing

The printer is the definition of canonical form. Hashes are SHA-256 over printed text, so every writer MUST
produce these bytes exactly:

- A list prints as `(`, its items separated by exactly one space, then `)`. No space after `(` or before `)`.
  The empty list prints as `()`.
- An integer prints in decimal with a leading `-` when negative, no `+`, no leading zeros.
- A symbol prints as itself.
- A string prints between `"` with these escapes, chosen per code unit:

  | Code unit                     | Printed                   |
  | ----------------------------- | ------------------------- |
  | `"` (34)                      | `\"`                      |
  | `\` (92)                      | `\\`                      |
  | LF (10)                       | `\n`                      |
  | TAB (9)                       | `\t`                      |
  | CR (13)                       | `\r`                      |
  | other below 32, and DEL (127) | `\u` and 4 lower-case hex |
  | anything else                 | the code unit itself      |

  Non-ASCII characters are never escaped. A surrogate pair passes through as its two code units.

- A printed form has no line breaks and no trailing space. Files that hold one form (objects, metadata) add one
  `\n` after it; that newline is not part of the hashed text.

Printed text becomes bytes as UTF-8. A lone surrogate code unit is encoded as U+FFFD by both kernels' `Text.sha256`;
canonical Core never contains one.

### Reading

Readers accept more than the printer writes:

- Space, LF, TAB and CR separate items in any amount, and may appear anywhere between forms.
- `;` starts a comment to the end of the line.
- Any number of top-level forms may follow each other.
- An atom that matches `-?[0-9]+` is an integer; everything else (`-`, `+5`, `1a`) is a symbol.
- Integers are 32-bit. A reader converts the decimal value with JavaScript `ToInt32` semantics, so an out-of-range
  literal wraps modulo 2^32. The printer only ever writes values in `-2147483648..2147483647`.
- In a string, `\` followed by any character other than `n`, `t`, `r`, `u` reads as that character. `\u` takes
  exactly the next four characters as hex. A malformed `\u` escape is undefined behaviour; writers never produce one.

A reader MUST fail on an unterminated string, an unmatched `)` or an unclosed `(`. In a kernel this is a panic
(see [Failure](#failure)).

## Values

A kernel works with these values:

| Value        | Made by                                                                                             |
| ------------ | --------------------------------------------------------------------------------------------------- |
| integer      | `(int n)`, primitives; 32-bit two's complement, wrapping                                            |
| text         | `(text "s")`, primitives; UTF-16 code units                                                         |
| data         | a saturated constructor: type hash, tag, fields                                                     |
| function     | `(lam …)`, a partial application, a constructor or operation that is not yet saturated, a primitive |
| continuation | a handler clause's last binder                                                                      |
| cell, map    | `Ref.new`, `Array.make`, `Dict.fromList`, `MutMap.new`; compared by identity                        |

`Bool` is data of `#Bool` (`false` tag 0, `true` tag 1), so `(con "#Bool" 1 0)` is `true`.

## Terms

Variables are de Bruijn indices: `(var 0)` is the innermost bound variable. Binder names never appear in Core;
they are kept in metadata ([Metadata](#metadata)).

| Term                    | Meaning                                                        |
| ----------------------- | -------------------------------------------------------------- |
| `(var i)`               | the `i`-th enclosing binder, counting from 0                   |
| `(ref "h")`             | the definition with hash `h`                                   |
| `(int n)`               | an integer literal                                             |
| `(text "s")`            | a text literal                                                 |
| `(lam b)`               | a one-argument function with body `b`                          |
| `(app f a₁ … aₙ)`       | apply `f` to `a₁`, then the result to `a₂`, and so on; `n ≥ 1` |
| `(let v b)`             | evaluate `v`, bind it, evaluate `b`                            |
| `(seq a b)`             | evaluate `a`, discard it, evaluate `b`                         |
| `(letrec (f₁ … fₙ) b)`  | mutually recursive functions; each `fᵢ` MUST be a `lam`        |
| `(if c t e)`            | `t` when `c` is `true`, else `e`                               |
| `(con "T" tag arity)`   | constructor `tag` of type hash `T`, as a value                 |
| `(match s c₁ … cₙ)`     | the first case whose pattern matches `s`                       |
| `(op "A" index arity)`  | operation `index` of ability hash `A`, as a value              |
| `(handle b r? o₁ … oₙ)` | evaluate `b` under a deep handler                              |
| `(prim "name")`         | a kernel primitive ([Primitives](#primitives))                 |

A case is `(case p body)` or `(gcase p guard body)`. A handler clause `r` is `(ret body)`; it is optional and
comes before the operation clauses. An operation clause is `(on "A" index arity body)`.

Note: the current compiler never writes `gcase`. Both kernels and the type checker accept it.

### Evaluation

Evaluation is strict, left to right.

- **`app`** evaluates `f`, then each argument in order, then applies. Applying a function to fewer arguments than
  it takes makes a partial application; to more, applies the result to the rest. A constructor applied to more
  arguments than its arity is a defect. Applying a value that is not a function is a defect.
- **`lam`** captures the current environment. `(lam (lam b))` is a curried two-argument function. Kernels may treat
  nested lambdas as one n-ary function; the result is the same.
- **`ref`** evaluates the referenced definition once, on first use, and caches its value. A definition whose body is
  a `lam` is a value at once. A definition that needs its own value while it is being evaluated is a defect.
  A hash the kernel has not loaded is a panic.
- **`if`** takes the then branch when the condition is `true`. Any other value takes the else branch.
- **`match`** tries cases in order. The first pattern that matches binds its variables and evaluates the body.
  For `gcase`, the guard is evaluated with the bindings; if it is not `true`, matching continues with the next
  case. When no case matches, the kernel raises the defect `no match for <value>`.
- **`con`** with arity 0 is the data value itself. With arity `k > 0` it is a curried function that builds the data
  value once it has `k` arguments.
- **`op`** with arity `k` is a curried function. Once it has `k` arguments it performs a request
  ([Handlers](#handlers)). Every operation has `k ≥ 1`; an operation that takes nothing takes `Unit`.
- **`prim`** is a curried function of the primitive's arity. An unknown name is a panic.

### Binder order

Every binder pushes one variable. Inside the scope, the most recent binder is `(var 0)`.

| Form                   | Binds, outermost first                                      | In scope in        |
| ---------------------- | ----------------------------------------------------------- | ------------------ |
| `(lam b)`              | the argument                                                | `b`                |
| `(let v b)`            | the value of `v`                                            | `b` (not `v`)      |
| `(letrec (f₁ … fₙ) b)` | `f₁`, …, `fₙ`, so `fₙ` is `(var 0)` and `f₁` is `(var n-1)` | every `fᵢ` and `b` |
| `(case p body)`        | the pattern's variables, left to right                      | `body`             |
| `(gcase p g body)`     | the pattern's variables, left to right                      | `g` and `body`     |
| `(ret body)`           | the body's result                                           | `body`             |
| `(on "A" i k body)`    | argument 1, …, argument `k`, then the continuation          | `body`             |

`match` itself binds nothing: the scrutinee is not in scope in the cases. The `ret` and `on` bodies see the
environment where the `handle` was evaluated, plus their own binders.

Example, from `sum xs := let rec go acc ys := …; go 0 xs`:

```text
(lam (letrec ((lam (lam (match (var 0) (case (pcon "#List" 0) (var 1)) (case (pcon "#List" 1 (pvar) (pvar))
  (app (var 4) (app (prim "Int.add") (var 3) (var 1)) (var 0))))))) (app (var 0) (int 0) (var 1))))
```

In the cons case, `rest` is `(var 0)`, `y` is 1, `ys` is 2, `acc` is 3, `go` is 4 and `xs` is 5.

## Patterns

| Pattern                  | Matches                                                  | Binds                       |
| ------------------------ | -------------------------------------------------------- | --------------------------- |
| `(pany)`                 | anything                                                 | nothing                     |
| `(pvar)`                 | anything                                                 | the value                   |
| `(pas p)`                | what `p` matches                                         | the whole value, then `p`'s |
| `(pint n)`               | the integer `n`                                          | nothing                     |
| `(ptext "s")`            | the text `s`                                             | nothing                     |
| `(pcon "T" tag p₁ … pₖ)` | data of type `T` with tag `tag`, fields matched in order | `p₁`'s, then `p₂`'s, …      |

A `pcon` lists one sub-pattern per field. `true` is `(pcon "#Bool" 1)`, the empty list `(pcon "#List" 0)`.

## Handlers

`(handle b r? o…)` installs a handler and evaluates `b`.

- When `b` returns a value, the `ret` clause runs with that value bound. Without `ret`, the value is the result.
- Performing an operation `(A, index)` with its arguments finds the innermost installed handler with a clause for
  `(A, index)`. The continuation is captured from the point of the request up to and including that handler.
  The handler is then removed, and the clause body runs with the arguments and the continuation bound.
- The continuation is a one-argument function. Applying it to `v` resumes the request with `v` as its result,
  with the handler installed again (deep handlers). It may be called more than once, or never.
- A request no Core handler catches goes to the host: `#IO` operations are performed by the host. Any other
  ability is a defect (`unhandled ability <A> operation <index>`) under the command-line kernels. An embedder
  instead suspends the run and answers the request itself ([EMBEDDING.md](./EMBEDDING.md)).

Mutable cells (`Ref`, `Array`, `MutMap`) are not rolled back when a continuation is resumed more than once.

## Builtin identities

A type or ability whose IRI starts with `#` is a builtin. Its hash is its IRI, and the kernels construct and match
these values themselves, so the tags below are fixed. Outside Core (embedding results, values as JSON)
a builtin `#Name` is written `urn:deus:builtin:Name` ([D68](../DECISIONS.md)).

| Identity                             | Kind    | Constructors or operations, by tag / index |
| ------------------------------------ | ------- | ------------------------------------------ |
| `#Unit`                              | type    | 0 `unit`                                   |
| `#Bool`                              | type    | 0 `false`, 1 `true`                        |
| `#List`                              | type    | 0 `nil`, 1 `cons head tail`                |
| `#Option`                            | type    | 0 `none`, 1 `some value`                   |
| `#Pair`                              | type    | 0 `mk fst snd`                             |
| `#Int`, `#Text`                      | type    | none; primitive values                     |
| `#Ref`, `#Array`, `#Dict`, `#MutMap` | type    | none; opaque values made by primitives     |
| `#IO`                                | ability | see below                                  |
| `#Defect`                            | ability | 0 `raise : Text -> a`                      |

Tuples are right-nested pairs: `(a, b, c)` is `#Pair a (#Pair b c)`. The unit value is `(con "#Unit" 0 0)`.

`#IO` operations, by index (from [`src/kernel/host.ts`](../../src/kernel/host.ts)):

| Index | Operation   | Type                         | Index | Operation    | Type                                     |
| ----- | ----------- | ---------------------------- | ----- | ------------ | ---------------------------------------- |
| 0     | `print`     | `Text -> Unit`               | 9     | `exit`       | `Int -> a`                               |
| 1     | `eprint`    | `Text -> Unit`               | 10    | `time`       | `Unit -> Int` (ms since start)           |
| 2     | `readFile`  | `Text -> Option Text`        | 11    | `readStdin`  | `Unit -> Text`                           |
| 3     | `writeFile` | `Text -> Text -> Unit`       | 12    | `writeBytes` | `Text -> List Int -> Unit`               |
| 4     | `exists`    | `Text -> Bool`               | 13    | `getEnv`     | `Text -> Option Text`                    |
| 5     | `listDir`   | `Text -> List Text` (sorted) | 14    | `isDir`      | `Text -> Bool`                           |
| 6     | `mkdirp`    | `Text -> Unit`               | 15    | `wallClock`  | `Unit -> Text` (ns since epoch, decimal) |
| 7     | `remove`    | `Text -> Unit`               | 16    | `appendFile` | `Text -> Text -> Unit`                   |
| 8     | `args`      | `Unit -> List Text`          | 17    | `exec`       | `Text -> List Text -> (Int, Text, Text)` |

`writeFile`, `writeBytes` and `appendFile` create missing parent directories. `exec` returns exit code 127 when the
program cannot start.

## Primitives

`(prim "name")` names a kernel function. The names are part of Core. [`deus/builtins.deus`](../../deus/builtins.deus)
binds each to a DEUS name and gives its type. A wrong argument type is a defect.

| Primitive                                   | Arity   | Meaning                                                                                                                   |
| ------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| `Int.add`, `Int.sub`, `Int.mul`             | 2       | 32-bit wrapping arithmetic                                                                                                |
| `Int.div`, `Int.mod`                        | 2       | truncating division and its remainder; divisor 0 is a defect                                                              |
| `Int.neg`                                   | 1       | wrapping negation                                                                                                         |
| `Int.and`, `Int.or`, `Int.xor`              | 2       | bitwise                                                                                                                   |
| `Int.shl`, `Int.shr`, `Int.ushr`            | 2       | shifts by the count modulo 32; `shr` keeps the sign, `ushr` does not                                                      |
| `Int.toText`                                | 1       | decimal text                                                                                                              |
| `Int.fromText`                              | 1       | `some n` when the text matches `-?[0-9]+` (wrapped to 32 bits), else `none`                                               |
| `eq`, `neq`                                 | 2       | structural equality on data; functions are never equal                                                                    |
| `compare`                                   | 2       | structural order: -1, 0 or 1; comparing functions is a defect                                                             |
| `lt`, `le`, `gt`, `ge`                      | 2       | `compare` against 0                                                                                                       |
| `append`                                    | 2       | concatenates two texts or two lists                                                                                       |
| `implies`                                   | 2       | `false` only for `true`, `false`                                                                                          |
| `Text.length`                               | 1       | length in code units                                                                                                      |
| `Text.code`                                 | 2       | code unit at an index, or -1 outside the text                                                                             |
| `Text.slice`                                | 3       | code units from start to end (JavaScript `slice`)                                                                         |
| `Text.fromCode`                             | 1       | a one-unit text                                                                                                           |
| `Text.fromCodes`                            | 1       | a text from a list of code units; a code above U+FFFF becomes its surrogate pair, and one outside 0..U+10FFFF is a defect |
| `Text.concat`                               | 1       | joins a list of texts                                                                                                     |
| `Text.join`                                 | 2       | joins a list with a separator (separator first)                                                                           |
| `Text.split`                                | 2       | splits a text at a separator (text first)                                                                                 |
| `Text.indexOf`                              | 3       | first index of a substring at or after a position, or -1                                                                  |
| `Text.trim`                                 | 1       | removes leading and trailing whitespace                                                                                   |
| `Text.sha256`                               | 1       | lower-case hex SHA-256 of the UTF-8 bytes                                                                                 |
| `Text.utf8`                                 | 1       | the UTF-8 bytes as a list of integers                                                                                     |
| `show`                                      | 1       | debug rendering of any value                                                                                              |
| `trace`                                     | 2       | writes `trace <label>: <value>` to stderr, returns the value                                                              |
| `defect`                                    | 1       | raises a defect with the message                                                                                          |
| `Ref.new`, `Ref.get`, `Ref.set`             | 1, 1, 2 | a mutable cell                                                                                                            |
| `Array.make`, `Array.length`                | 2, 1    | a mutable array of `n` copies of a value (D83); its length                                                                |
| `Array.get`, `Array.set`                    | 2, 3    | array, index (and value); an index outside `0 .. length` is a defect                                                      |
| `Dict.fromList`                             | 1       | an immutable map from a list of pairs; later keys win                                                                     |
| `Dict.lookup`, `Dict.contains`              | 2       | key first, then the map                                                                                                   |
| `Dict.size`, `Dict.keys`                    | 1       | size; keys in insertion order                                                                                             |
| `MutMap.new`                                | 1       | a new mutable map (takes `Unit`)                                                                                          |
| `MutMap.get`, `MutMap.has`, `MutMap.delete` | 2       | map first, then the key                                                                                                   |
| `MutMap.set`                                | 3       | map, key, value                                                                                                           |
| `MutMap.size`, `MutMap.keys`                | 1       | size; keys in insertion order                                                                                             |
| `Code.load`                                 | 1       | reads Core text and registers its `(def …)` forms; bad text is a panic                                                    |
| `Code.has`                                  | 1       | whether a hash is loaded                                                                                                  |
| `Code.run`                                  | 1       | evaluates a loaded definition in place: its requests reach the caller's handlers                                          |
| `Code.quote`                                | 1       | a data value as Core text (`(int …)`, `(text …)`, `(con …)`, `(app (con …) …)`); a function is `(prim "<function>")`      |
| `Code.steps`                                | 1       | machine steps so far                                                                                                      |
| `Code.cost`                                 | 1       | steps a `Unit -> a` function takes; it must handle its own requests                                                       |
| `Code.defectTrace`                          | 1       | hashes on the stack when the last defect was raised, innermost first                                                      |

Map keys MUST be texts or integers; any other key is a defect.

## Hashing

A definition's hash is the lower-case hex SHA-256 of the UTF-8 bytes of its canonical object text
([Objects](#objects)). Binder names, documentation and types inferred later are not part of it.

- A **non-recursive term, test or theorem** is hashed as its object: `sha256(print((term core)))`. References
  to other definitions are `(ref "<their hash>")`, so a hash covers everything it depends on.
- A **type or ability** with an IRI starting with `#` has that IRI as its hash. Any other type or ability is
  hashed as its object form. Field and operation types name other types by IRI (`(tref "urn:…")`), not by hash.
- A **recursive group** (a strongly connected component of the reference graph, including one definition that
  refers to itself) is hashed as one `cycle` form:

  1. For each member, build its object with every in-group reference written as `(self)`, with no index.
     Hash that text. This is the member's ordering key.
  2. Order members by ordering key (ordinal, by code unit). Member `i` is the `i`-th in this order.
  3. Build each member's object again with an in-group reference to member `i` written as `(self i)`.
  4. The group hash is `sha256(print((cycle obj₀ obj₁ …)))`.
  5. A group of one member has hash `<group>`. A larger group's member `i` has hash `<group>.i`, for example
     `6f0617…a6a3f.0`.

  The stored member object is step 3's object with each `(self i)` replaced by `(ref "<member i's hash>")`. Its
  stored text therefore does not hash to its own name. A verifier rebuilds the `cycle` form to check it.

Equal ordering keys mean equal shapes up to in-group references. The order between such members is the one the
compiler's sort leaves (a merge sort over the members in the order Tarjan's algorithm emits them, visiting names
sorted); an independent writer that must match hashes byte for byte has to break ties the same way.

Example, `isEven` and `isOdd` calling each other. Stored member `.0` is `isOdd`:

```text
(term (lam (if (app (prim "eq") (var 0) (int 0)) (con "#Bool" 0 0) (app (ref "6f0617f5c3…a6a3f.1")
  (app (prim "Int.sub") (var 0) (int 1))))))
```

The text that was hashed is `(cycle (term … (self 1) …) (term … (self 0) …))`.

## Objects

Each object kind has one printed form. A codebase stores the form under its hash
([CODEBASE-STORE.md](./CODEBASE-STORE.md)).

| Object    | Form                                                          |
| --------- | ------------------------------------------------------------- |
| term      | `(term core)`                                                 |
| test      | `(test core)`; `core` evaluates to a `Bool`                   |
| theorem   | `(theorem (binders ty₁ … tyₙ) prop (proof tok …))`            |
| type      | `(type "iri" nparams (ctor nfields ty …) …)`                  |
| ability   | `(ability "iri" nparams (op arity ty) …)`                     |
| namespace | `(ns (n "name" entry) …)`                                     |
| history   | `(causal (ns "h") (parents "h" …) (msg "text") (tasks "h")?)` |

- A theorem's `prop` is a Core function of its `n` binders that returns a `Bool`. Proof tokens are strings, except
  that lemma names inside `[ … ]` are `(ref "h")`, so the hash covers the lemmas.
- A type has one `ctor` per constructor, in tag order. A structure has exactly one. An ability has one `op` per
  operation, in index order; `arity` is the number of arrows in the operation's type.
- A namespace entry is one of `(term "h")`, `(test "h")`, `(theorem "h")`, `(spec "h")`, `(type "h" "iri" ("field"
…))`, `(ability "h" "iri")`, `(ctor "T" tag arity)` and `(op "A" index arity)`. Entries are sorted by name.
- `(tasks "h")` appears in a history node only when it has a tasks snapshot.
- `spec`, `task` and `tasks` objects belong to the codebase; see [MDL.md](./MDL.md) and
  [CODEBASE-STORE.md](./CODEBASE-STORE.md).

Types inside objects and metadata use this grammar:

```text
ty  = (tref "iri")                 ; a named type, by IRI
    | (tvar i)                     ; the declaration's i-th parameter
    | (tvar "a")                   ; a free type or row variable; "?" is unknown
    | (tapp ty ty …)               ; application
    | (tfun ty ty [ (eff ty …) ])  ; a function, with its effect row when written
    | (teff (eff ty …) ty)         ; a result with an effect row
    | (trow ty …)                  ; a row
```

Example, `Demo.Shape` with `circle (r : Int)` and `square (side : Int)`:

```text
(type "urn:deus:Demo.Shape" 0 (ctor 1 (tref "#Int")) (ctor 1 (tref "#Int")))
```

## Metadata

Metadata is stored beside an object, keyed by its hash, and is never hashed. It is one `(meta field …)` form.
Fields are omitted when empty, and appear in this order:

| Field                      | On                     | Content                                                          |
| -------------------------- | ---------------------- | ---------------------------------------------------------------- |
| `(sig ty)`                 | terms                  | the declared signature; `(tvar "?")` where a type is not written |
| `(doc "text")`             | all                    | the doc comment                                                  |
| `(locals "x" …)`           | terms, tests, theorems | binder names in pre-order of the Core form                       |
| `(attrs ("name" "v" …) …)` | terms, tests           | attributes such as `@[integration]`                              |
| `(params "a" …)`           | types, abilities       | parameter names                                                  |
| `(fields (c "x" …) …)`     | types                  | field names per constructor, when any is named                   |
| `(scheme ty)`              | terms, tests, theorems | the inferred type, added by the type checker                     |

`sig`, `doc`, `locals`, `attrs`, `scheme` is the order for terms; `doc`, `params`, `fields` for types.

`locals` lists one name per binder in the order a pre-order walk of the Core form meets binders. A `letrec` lists
its function names first, then walks the functions and body. A `handle` contributes its `ret` binder, then for
each `on` clause the argument names and the continuation name. A binder with no name contributes `""`.

```text
(meta (sig (tfun (tref "urn:deus:Demo.Shape") (tref "#Int"))) (doc "Area, roughly.") (locals "s" "r" "x")
  (scheme (tfun (tref "urn:deus:Demo.Shape") (tref "#Int") (eff (tvar "r2")))))
```

## Failure

A run ends in one of four ways. Exit codes are those of the command-line kernels ([`src/kernel/run.ts`](../../src/kernel/run.ts),
[`../deus-kernel/src/run.rs`](../../../deus-kernel/src/run.rs)).

| Outcome | Cause                                                   | Exit | Stderr                                        |
| ------- | ------------------------------------------------------- | ---- | --------------------------------------------- |
| success | `main` returned                                         | 0    | nothing                                       |
| exit    | `IO.exit n`                                             | `n`  | nothing                                       |
| defect  | the program is wrong and no `#Defect` handler caught it | 70   | `defect: <message>` then `  at #<hash>` lines |
| panic   | the image or the kernel is broken                       | 71   | `panic: <message>`                            |

**Defects** are a failed match, division by zero, `defect "…"`, a wrong primitive argument, applying a
non-function, a definition that needs its own value, an unhandled non-`IO` operation, and an exhausted step
budget (`DEUS_MAX_STEPS`). The kernel turns a defect into the request `(#Defect, 0)` with the message as its
argument, so a Core handler can observe it. A handler MUST NOT resume that continuation. The trace lists the
definitions the defect passed through, innermost first, up to 32.

**Panics** are malformed text, a malformed image, an unknown term or pattern head, a field of the wrong kind
(for example a string where an integer belongs), an unknown primitive, a reference to a hash that is not loaded,
and an unbound variable. A panic is never caught by Core.

A kernel MUST treat any Core form it does not recognize as a panic, not skip it.

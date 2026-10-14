# Compiled wasm module format

`deus build <fn> -o <file.wasm> --wasm` compiles one definition, and every definition it calls, from
[Core](./CORE.md) straight to a binary WebAssembly module ([D51](../DECISIONS.md), [D56](../DECISIONS.md)).
The compiler is DEUS code that emits bytes, [`deus/wasm.deus`](../../deus/wasm.deus); the command is in
[`deus/cli.deus`](../../deus/cli.deus). Any wasm engine with the tail-call extension reads the module; a
host calls its exported function with `i32` arguments and reads an `i32` back, building and reading heap
blocks through the exported `memory` and `alloc`. The compiler accepts a first-order subset of Core and
refuses everything else, naming the form. Programs outside the subset run on the wasm kernel instead
([EMBEDDING.md](./EMBEDDING.md)).

## The subset

The compiler starts at the named definition and follows every `(ref "h")` in its body, breadth first.
Each definition reached must be a stored `(term core)` object whose Core is one or more `lam`s around a
body; the number of `lam`s is its arity, at least 1. The body may contain only these forms:

| Core form                                            | Compiles to                                                                   |
| ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| `(int n)`                                            | `i32.const n`                                                                 |
| `(var i)`                                            | `local.get` of the local bound to de Bruijn index `i`                         |
| `(let v b)`                                          | `v`, `local.set` to a fresh local, then `b`                                   |
| `(seq a b)`                                          | `a`, `drop`, `b`                                                              |
| `(if c t e)`                                         | `c`, `if (result i32) t else e end`                                           |
| `(con "#Bool" tag 0)`                                | `i32.const tag` (`false` 0, `true` 1)                                         |
| `(con "T" tag 0)`                                    | a heap block holding only `tag`                                               |
| `(app (con "T" tag n) a₁ … aₙ)`                      | a heap block `[tag, a₁ … aₙ]`; `n` must equal the argument count              |
| `(match s (case p b) …)`                             | see [Match](#match)                                                           |
| `(app (prim "Int.neg") a)`                           | `i32.const 0`, `a`, `i32.sub`                                                 |
| `(app (prim p) a b)`                                 | `a`, `b`, the instruction for `p` below                                       |
| `(app (ref "h") a₁ … aₙ)`                            | `call` (or `return_call` in tail position) of `h`; `n` must equal `h`'s arity |
| `(app (prim "Array.…") …)`, `(app (prim "Ref.…") …)` | see [Arrays and cells](#arrays-and-cells)                                     |

| Primitive | Instruction | Primitive  | Instruction |
| --------- | ----------- | ---------- | ----------- |
| `Int.add` | `i32.add`   | `eq`       | `i32.eq`    |
| `Int.sub` | `i32.sub`   | `neq`      | `i32.ne`    |
| `Int.mul` | `i32.mul`   | `lt`       | `i32.lt_s`  |
| `Int.div` | `i32.div_s` | `gt`       | `i32.gt_s`  |
| `Int.mod` | `i32.rem_s` | `le`       | `i32.le_s`  |
| `Int.and` | `i32.and`   | `ge`       | `i32.ge_s`  |
| `Int.or`  | `i32.or`    | `Int.shl`  | `i32.shl`   |
| `Int.xor` | `i32.xor`   | `Int.shr`  | `i32.shr_s` |
|           |             | `Int.ushr` | `i32.shr_u` |

Patterns allowed in a `case`: `(pany)`, `(pvar)`, `(pas p)`, `(pint n)`, `(pcon "#Bool" tag)` and
`(pcon "T" tag p …)` with sub-patterns from this list.

A definition whose whole body is a primitive (`def Int.and := prim "Int.and"`) is not compiled as a
function: calls to it become the primitive, so `Int.and x y` compiles like `x &&& y` would.

Self-recursion and mutual recursion between top-level definitions compile. Local recursion (`letrec`),
lambdas that are not a definition's leading parameters, partial application, functions as values, `text`
literals, `ptext` patterns, abilities (`op`, `handle`) and every other primitive are outside the subset.

## Values

Every value is an `i32`.

- `Int` is itself. Arithmetic wraps at 32 bits, as in the interpreter.
- `Bool` is 0 or 1.
- Any other constructed value, `Unit` and `Option` included, is the address of a block in linear memory:
  word 0 is the constructor's tag (its 0-based index in the type) and word `i + 1` is field `i`. Words are
  4 bytes, little-endian, 4-byte aligned. A nullary constructor is a one-word block.

```text
block  = tag:i32 field₀:i32 … fieldₙ₋₁:i32      at address a, field i at a + 4 + 4·i
```

The type of a block is not stored. A host that builds an argument or reads a result must know the type
from the definition's signature.

`eq`, `neq`, `lt`, `gt`, `le` and `ge` compare the `i32`s, which is structural only for `Int` and `Bool`.
On constructed values it would compare addresses, while the interpreter compares structure, so the
compiler refuses a comparison unless it can see that one side is an `Int` or a `Bool`
([D69](../DECISIONS.md)). It sees types from each definition's stored scheme (or signature) for its
parameters, from call results, from `let` values, and from the data type's constructor fields for what a
pattern binds. `some x == some x` is refused with
`eq on values that are not known to be Int or Bool is outside the wasm subset, …`.

## Module layout

The module is wasm version 1 with these sections, in order, and no others (no imports, table, start,
element or data section). Let `F₀ … Fₖ₋₁` be the definitions in the order they were reached, with `F₀` the
named one.

| Section      | Content                                                                       |
| ------------ | ----------------------------------------------------------------------------- |
| type (1)     | `k + 1` types: type `i` is `(i32 × arity(Fᵢ)) → i32`; type `k` is `i32 → i32` |
| function (3) | `k + 1` functions; function `i` has type `i`. Function `k` is `alloc`         |
| memory (5)   | one memory, minimum 1 page, no maximum                                        |
| global (6)   | one mutable `i32`, the heap pointer, initialized to 8                         |
| export (7)   | `<name>` → function 0, `memory` → memory 0, `alloc` → function `k`            |
| code (10)    | the `k` compiled bodies, then `alloc`                                         |

`<name>` is the last dot-separated segment of the name given on the command line: `deus build M.sumTo
--wasm` exports `sumTo`. Each definition is one function, so calls between them are direct.

A real module for `def sumTo (n : Int) (acc : Int) : Int := if n == 0 then acc else sumTo (n - 1) (acc + n)`
(decimal bytes):

```text
0 97 115 109 1 0 0 0                          magic, version 1
1 12 2 96 2 127 127 1 127 96 1 127 1 127      types: (i32 i32)→i32, i32→i32
3 3 2 0 1                                     functions: sumTo, alloc
5 3 1 0 1                                     memory: min 1 page
6 6 1 127 1 65 8 11                           global: mut i32 = 8
7 26 3 5 "sumTo" 0 0 6 "memory" 2 0 5 "alloc" 0 1
10 82 2 25 0 32 0 65 0 70 4 127 32 1 5 32 0 65 1 107 32 1 32 0 106 18 0 11 11 …
```

Locals: a function's parameters are locals `0 … arity − 1`, the first Core `lam` binding local 0. Every
`let`, `match` scrutinee, pattern field and constructed block takes one more `i32` local; they are
declared as one run.

Tail position is the body of a definition, both branches of an `if`, the second operand of a `seq`, the
body of a `let` and the body of each `case`. A call there is `return_call` (opcode `0x12`), so recursion
in tail position runs in constant stack; the engine must support the tail-call extension.

## Match

A `match` stores the scrutinee in a fresh local and compiles to one outer block with an `i32` result and
one inner block per case. Inside a case's block, the pattern's tests come first; a failed test leaves the
inner block with `br_if 0` and falls through to the next case. If every test passes, the case's body runs
and `br 1` leaves the outer block with its value. After the last case the code is `unreachable`, so a
value no case matches traps.

| Pattern                          | Test                                                                                                                                   |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `(pany)`                         | none                                                                                                                                   |
| `(pvar)`                         | none; binds the value's local                                                                                                          |
| `(pas p)`                        | binds the value's local, then `p`                                                                                                      |
| `(pint n)`, `(pcon "#Bool" tag)` | value `≠` `n` (or `tag`) leaves the case                                                                                               |
| `(pcon "T" tag p …)`             | word 0 `≠` `tag` leaves the case; then each field that is not `(pany)` is loaded into a fresh local and tested against its sub-pattern |

Bindings follow Core's order: left to right, the last one bound is `(var 0)`.

## Arrays and cells

`Array` and `Ref` ([D83](../DECISIONS.md)) are blocks in linear memory too, without a tag word.

| Primitive                | Code                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `Array.make n x`         | traps if `n < 0`; `alloc(4 + 4n)`, word 0 is `n`, words 1 … n are `x`; the block's address |
| `Array.length a`         | word 0 of `a`                                                                              |
| `Array.get a i`          | traps unless `0 ≤ i < length` (unsigned compare); word `i + 1`                             |
| `Array.set a i v`        | the same check; a copy of `a` (`memory.copy`) with `v` in word `i + 1`; the copy's address |
| `Array.setInPlace a i v` | the same check; stores `v` in word `i + 1` of `a`; returns `a`                             |
| `Array.copy a`           | a new block with `a`'s words; its address                                                  |
| `Ref.new v`              | `alloc(4)`, word 0 is `v`; the block's address                                             |
| `Ref.get r`              | word 0 of `r`                                                                              |
| `Ref.set r v`            | stores `v` in word 0; returns `0`                                                          |

`Ref.set` returns `()` as address 0: the heap starts at 8, so word 0 is always 0, the tag of `Unit`'s
only constructor. The type checker sees `Array.get` and `Ref.get` return the element type of their
argument's type, so a comparison of an element of an `Array Int` compiles.

### Unique arrays

`Array.set` is pure ([D96](../DECISIONS.md), the codebase's [`Array.Spec`](../../codebase/specs/Array.Spec.mdl)): it returns a new array and the old
one stays readable. `Array.setInPlace` and `Array.copy` are not in the language. A pass over Core,
[`deus/unique.deus`](../../deus/unique.deus), runs after the functions are gathered. This back end
never frees memory and its blocks carry no count, so uniqueness has to be proved statically; the C back
end, and wasm built through it, count references and check for a count of one at run time instead
([NATIVE.md](NATIVE.md)). The pass rewrites an `Array.set` to `Array.setInPlace` when nothing reads the old array afterwards, and inserts
`Array.copy` where an array would otherwise get a second owner. Its rules:

| Rule              | Meaning                                                                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| owned             | a local of type `Array` that no other code can read: a parameter that is not borrowed, a `let` whose value is fresh, a fresh structure's array field |
| borrowed          | a parameter the function only reads (`Array.get`, `Array.length`, a borrowed parameter of a call); found by fixpoint                                 |
| moved             | an owned local at its last use: not used later, and not pending in an earlier argument of the same call                                              |
| fresh             | `make`, `set`, `copy`, a moved local, a call whose declared result is an `Array`, or an `if`, `let`, `seq` or `match` whose results are              |
| fresh structure   | a function whose every result is a constructor of one monomorphic type (or a call to such a function); `match f … with (a, i)` owns `a`              |
| must be fresh     | an owned parameter's argument, an `Array` result, and a fresh structure's array fields: copied when not fresh                                        |
| stored while live | an owned local passed to a constructor, a `let`, a `Ref`, an array item or a generic parameter while it is still used later: copied                  |

Arguments are evaluated before a call runs, so a read in a later argument (`swap a i (Array.get a j)`)
does not stop `a` from moving into the call. A write in an earlier argument does: the later argument
runs after it. [`examples/aliasing.deus`](../../examples/aliasing.deus) holds one case per rule, and a
test checks that wasm, and C, give the kernel's answer for each. The pure quicksort in
[`examples/sorting.deus`](../../examples/sorting.deus) compiles with no copy at all.

## Allocation

`alloc(n)` returns the current heap pointer and advances it by `n` bytes. When the new pointer passes the
end of memory (`memory.size × 65536`), memory grows by the larger of the pages still missing and the
current size, so a growing heap doubles and grows a logarithmic number of times. Nothing is freed; `deus build -o <file>.wasm --c` builds wasm through the [C back end](./NATIVE.md#wasm-through-c) instead, which frees by reference counting (D90). The
heap starts at address 8, so no block has address 0.

The compiled code calls `alloc` with `4 + 4 × fields`. A host may call it too, to build arguments: allocate
`4 + 4 × fields` bytes, store the tag and fields, and pass the address. Blocks the host builds must keep the
same layout and 4-byte alignment.

## Traps

The module traps where the interpreter raises a defect, and in two places where it does not:

- `Int.div` or `Int.mod` by zero traps (the interpreter raises `division by zero`).
- `Int.div` of −2147483648 by −1 traps (the interpreter wraps to −2147483648).
- A `match` with no matching case traps.
- `memory.grow` failing is not checked; the next store out of bounds traps.

## Refusals

The compiler stops at the first form outside the subset. `deus build` then writes no file, prints
`deus: <message>` on stderr and exits with code 1 ([CLI-JSON.md](./CLI-JSON.md)). The messages are:

| Cause                                                                                                 | Message                                                                                                    |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| a reached definition has no `lam`                                                                     | `#<hash prefix> is not a function, so it is outside the wasm subset`                                       |
| a reached object is not a `(term …)`                                                                  | `#<hash prefix> is not a term the wasm back end can compile`                                               |
| a call with the wrong number of arguments                                                             | `#<hash prefix> takes <n> arguments but is applied to <m>; partial application is outside the wasm subset` |
| a constructor applied to a number of arguments other than its arity, or a `#Bool` constructor applied | `partial application of a constructor of <T> is outside the wasm subset`                                   |
| a primitive not in the table                                                                          | `the primitive <p> is outside the wasm subset`                                                             |
| a pattern not in the list                                                                             | `the pattern <pattern> is outside the wasm subset`                                                         |
| any other form                                                                                        | `outside the wasm subset: <first 120 characters of the form>`                                              |

`<hash prefix>` is the first 10 characters of the hash. Example: a definition returning `"hi"` fails with
`deus: outside the wasm subset: (text "hi")`.

Note: the usage line in `deus help` says the subset is "first-order Int/Bool" functions; it also covers
algebraic data since D56.

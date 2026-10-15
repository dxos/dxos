# Native compilation: the C back end and how fast DEUS can get

`deus build <fn> -o <file> --c` compiles one definition, and every definition it calls, from
[Core](./CORE.md) to C, then runs `$CC` (default `cc`) at `-O2` to make an executable
([D80](../DECISIONS.md)). With `-o <file>.c` it writes only the C. The compiler is DEUS code,
[`deus/cgen.deus`](../../deus/cgen.deus). With clang as `$CC`, LLVM does the optimizing, so this is
also the LLVM path.

## The subset

The C back end reuses the [wasm compiler](./WASM.md#the-subset)'s gathering and type tracking and
accepts its first-order subset: literals, locals, `let`, `seq`, `if`, `match`, constructors, the
integer and comparison primitives, `Array` and `Ref`, and calls of other such definitions. On top of
that it compiles higher-order code ([D111](../DECISIONS.md)): lambdas, partial and over-application,
definitions used as values, calls of unknown functions, and `letrec`, so the prelude's `List.map`,
`List.filter`, `List.foldl`, `List.zip`, `Option.map` and the like compile. A C runtime adds `Text`
([D115](../DECISIONS.md)): literals, `++` on texts and on lists, `Text.length`, `code`, `slice`,
`fromCode`, `concat`, `join`, `split`, `indexOf`, `trim`, `Int.toText`, `Int.fromText`, text
patterns, and `==`, `<`, `compare` on texts. `==`, `<` and `compare` on data compare structurally
([D117](../DECISIONS.md)). `Dict` and `MutMap` are hash tables in the runtime, and a constant
such as `Map.empty` is inlined where it is used, so `Map` compiles too ([D119](../DECISIONS.md)).
`show` is type-directed, one rendering function per type, and `Text.utf8`, `Text.fromCodes` and
`Text.sha256` are in the runtime ([D120](../DECISIONS.md)). Comparing arrays or functions, and `show`
on a value whose type the compiler does not know, are still refused. Effect handlers compile when
every clause resumes in tail position or not at all ([D123](../DECISIONS.md)); a clause that resumes
anywhere else is refused. Error messages for refused forms
name the C subset, except the ones raised while gathering definitions, which name the wasm subset.

## The C it writes

| Core                              | C                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| a definition of arity n           | `static V fᵢ(V l0, …, V lₙ₋₁)`; `V` is `intptr_t`                                                       |
| `(int n)`                         | `(V)n`                                                                                                  |
| `Int.add`, `sub`, `mul`           | `ADD(a, b)` …: computed in `uint32_t`, sign-extended back, so arithmetic wraps at 32 bits               |
| `Int.div`, `Int.mod`              | `DIV`, `MOD`: trap on zero; `x / -1` is `0 - x`, as in the interpreter                                  |
| comparisons, `and`/`or`/`xor`     | the C operator on `V`s, cast back to `V`                                                                |
| `(con "T" tag 0)`                 | `(V)&deus_nullary[tag]`: one static block per tag, never allocated                                      |
| `(app (con "T" tag n) a…)`        | a counted block `[tag, a…]` (see [Memory](#memory)), or a dead block's memory reused                    |
| `match`                           | one `do { tests; body } while (0)` per case; a failed test `break`s to the next case                    |
| `let`, `seq`, `match` (non-tail)  | GNU statement expressions `({ … })` (clang and gcc)                                                     |
| call to itself in tail position   | arguments into temporaries, then the parameters, then `goto top`                                        |
| other tail call, same arity       | `MUSTTAIL return fⱼ(…)`: `__attribute__((musttail))`, a guaranteed jump, where the compiler has it      |
| other call                        | `fⱼ(…)`                                                                                                 |
| `(lam b)`                         | a closure: a counted block `[code, captured…]`; `b` is lifted to `static V cₖ(V self, V arg)`           |
| call of an unknown function       | `deus_apply(f, x)`: the code borrows the closure, which reads its captures without counting them        |
| `fⱼ` applied to too few arguments | the arguments bound, then one lambda per missing parameter around the full call                         |
| `(letrec (f…) b)`                 | each `f` lifted to a top-level function taking its captures first; uses become direct calls             |
| `(text "…")`                      | a block made on first use and kept: a count no program brings to one, not counted as live               |
| a `Text` primitive                | a runtime function (`deus_text_slice` …) that borrows its arguments; owned ones are dropped after       |
| `a ++ b` on texts                 | `deus_text_extend`: a unique `a` grows in place, doubling its capacity when full                        |
| `a ++ b` on lists                 | `deus_list_append`: the unique prefix of `a` is relinked in place, the shared rest copied               |
| `<`, `==` of untyped values       | `deus_cmp_any`, `deus_eq_any`: texts by their units, integers by value; any other block traps           |
| `<`, `==`, `compare` on data      | `deus_cmpₖ`, `deus_eqₖ`, one pair per data type: tags, then fields; a last field of the same type loops |

The named definition is also exported as `int32_t <name>(int32_t …)`, and `-DDEUS_MAIN` (which
`deus build` passes) adds a `main` that reads each argument as an integer and prints the result as
one, or, for a `Text` result, as the interpreter shows it (JSON, in UTF-8). Another constructed result
prints as its address.

`Text` is a block `[length, capacity, UTF-16 units…]`, so lengths, indices, slicing and ordering
agree with both kernels unit for unit (JavaScript string semantics). `Int.fromText` wraps to 32 bits
as `Number(t) | 0` does, exactly for numerals below 2^53.

## Memory

Blocks are reference counted with reuse, as in Perceus (Koka, Lean 4) ([D86](../DECISIONS.md)).

- **Layout.** A block is preceded by a header word: its count times 256 plus its kind. The kind is
  the field count for a constructor, 254 for a `Ref` `[value]` and 255 for an `Array`
  `[length, item…]`. Nullary constructors and `()` are static and never counted.
- **Telling blocks from integers.** Every block lives in one 64 GiB region reserved with `mmap`
  (`MAP_NORESERVE`), so a word is a block exactly when it points into that region. Sign-extended
  `Int`s never do. Code whose types say `Int`, `Bool` or `Unit` skips the check.
- **Ownership.** A function owns its parameters and every local it binds, and consumes each exactly
  once: the last use moves it, earlier uses `deus_dup` it, and a path that never uses it drops it
  first. Arguments are evaluated left to right into locals, so a drop can never run before an
  earlier argument's use. A local passed as an argument itself, with no later argument consuming
  it, moves there even when later arguments read it: the moved value lives until the call, so
  `Array.set a i (Array.get a j)` counts nothing and still writes in place ([D98](../DECISIONS.md)).
- **Borrowing.** A parameter that a function only reads through (as the container of an `Array` or
  `Ref` access, or as an argument its callee borrows) is borrowed: the caller keeps ownership and
  passes it without counting. The borrowed set is the largest one no body consumes, found by
  iterating from "every non-scalar parameter". A matched local is borrowed by the match itself,
  so matching does not touch the count.
- **Reuse.** A case that takes apart a block the code owns and does not use again checks whether
  the block is unique. If it is, the fields' references pass to the case and, when the case builds
  a block with the same number of fields, it builds it in the old block's memory. If it is shared,
  the case counts the fields it uses and decrements the block.
- **Freeing** is iterative, with an explicit stack, so dropping a long list does not overflow the
  C stack. Freed blocks of up to 256 words go to a free list per size. Larger ones (long arrays)
  go to one list, and an allocation of that size takes the first exact fit among its first 16
  entries, so a loop that makes a fresh 1000-item array each time allocates one ([D102](../DECISIONS.md)).
  `Ref` cycles are never freed.

`DEUS_HEAP_STATS=1` makes a built executable print the words bumped, live at exit and at peak. Every
benchmark ends with 0 live words.

| Program (clang -O2)           | Time before (no freeing) | Time with RC and reuse | Peak RSS before | Peak RSS after |
| ----------------------------- | -----------------------: | ---------------------: | --------------: | -------------: |
| `fib 35`                      |                    57 ms |                  50 ms |                 |                |
| `collatz 100000`              |                    48 ms |                  29 ms |                 |                |
| `trees 200`                   |                   278 ms |                 163 ms |          301 MB |          10 MB |
| `queens 11`                   |                    29 ms |                  36 ms |           10 MB |          10 MB |
| `Sorting.benchMerge 10⁶`      |                   726 ms |                 842 ms |          949 MB |          62 MB |
| `Sorting.benchQuick 10⁶`      |                   602 ms |                 473 ms |          597 MB |          32 MB |
| `Sorting.benchHeap 10⁶`       |                 1,765 ms |               1,700 ms |        1,292 MB |          78 MB |
| `Sorting.benchArray 10⁶`      |                   162 ms |                 174 ms |           55 MB |          39 MB |
| `Sorting.benchPersistent 10⁶` |                 2,095 ms |               1,337 ms |        1,610 MB |          39 MB |

`benchPersistent` measured a persistent array written in DEUS; D96 removed it, since `Array` itself
is now pure. `benchArray` is the pure quicksort since D96 (about 200 ms at 10⁶ through C).

Peak RSS is the process's maximum resident set; 10 MB is the floor of an empty run. The sorts'
peaks after are the input list and the sorted output, which are alive together. `queens` and
`benchMerge` pay for counting shared cons cells; everything else is as fast or faster, because a
reused block is already in cache and the heap stays small.

## Wasm through C

`deus build <fn> -o <file>.wasm --c` compiles the same C with clang for `wasm32`
(`--target=wasm32 -O2 -mtail-call -nostdlib -Wl,--no-entry`; `$WASM_CC` overrides `clang`), so
wasm gets the C back end's reference counting and reuse ([D90](../DECISIONS.md)). The module
exports the function as `<name>(i32…) → i32`, its `memory`, and `deus_live()`, the words still
allocated. It imports nothing.

- **Values are 64 bits.** wasm32 addresses and `Int`s are both 32 bits, so a word cannot be told
  apart by range. A value is an `i64`: an `Int` sign-extended as before, a block its address with
  bit 32 set. The exported function's arguments and result stay `i32`.
- **The heap** starts at `__heap_base` and grows by doubling with `memory.grow`. `memset` and
  `memcpy`, which clang emits for some loops even with `-nostdlib`, are defined in the prelude.

Times in Node 22, best of three, and the module's memory after one run, against the existing
`--wasm` back end ([WASM.md](./WASM.md)), which never frees:

| Program                       | `--wasm` time | through C, RC | `--wasm` memory | through C memory |
| ----------------------------- | ------------: | ------------: | --------------: | ---------------: |
| `fib 35`                      |         82 ms |         76 ms |                 |                  |
| `collatz 100000`              |         34 ms |         26 ms |                 |                  |
| `trees 200`                   |        304 ms |        235 ms |          256 MB |             4 MB |
| `queens 11`                   |         38 ms |         42 ms |            2 MB |           < 1 MB |
| `Sorting.benchMerge 10⁶`      |        607 ms |      1,093 ms |          512 MB |            64 MB |
| `Sorting.benchQuick 10⁶`      |        443 ms |        670 ms |          512 MB |            32 MB |
| `Sorting.benchHeap 10⁶`       |      1,943 ms |      2,230 ms |        1,024 MB |           128 MB |
| `Sorting.benchArray 10⁶`      |        202 ms |        178 ms |           32 MB |            64 MB |
| `Sorting.benchPersistent 10⁶` |        985 ms |      1,482 ms |        1,024 MB |            64 MB |

Memory falls 8–64× wherever lists are built, and the integer and tree programs get faster. The
list sorts are 1.1–1.8× slower: their blocks are twice as wide as the `--wasm` back end's 32-bit
words, and a bump allocator that never frees is the cheapest allocator there is while memory lasts.
`benchArray` uses more memory for the same reason. A 32-bit value with a tag bit cannot win this
back: `Int` wraps at 32 bits, so a tag needs a 33rd ([D102](../DECISIONS.md)). `--wasm` stays the default: it needs no clang and is what the browser
build uses.

## Higher-order code

[`examples/closures.deus`](../../examples/closures.deus) maps, folds and composes over cons lists
with lambdas that capture locals, partial application (`mapInts (times k) ys`), a function returned as
a value (`after`), and the prelude's `List.filter`, `List.range`, `List.zip`, `List.any`,
`List.reverse` and `Option.map`. Every program agrees with the interpreter and ends with 0 live
words, natively and in wasm built through C.

| Program (best of three)        | TS kernel with JIT | C, clang -O2 |
| ------------------------------ | -----------------: | -----------: |
| `Closures.closureLoop 20000 0` |           1,430 ms |        75 ms |
| `Closures.hofLoop 1000 1000 0` |             450 ms |        62 ms |

JIT times are a `deus eval` of a tenth of the iterations (2,000 and 100) minus a 1-iteration run,
times ten. A call of an unknown function costs an indirect call; a lambda costs one block for its
captures. Both are 7–19× faster than the JIT here.

`letrec` functions are lambda-lifted, so their parameters have no stored type. A comparison of two
values the compiler cannot type is decided at run time: texts compare by their units, integers by
value, and any other block traps rather than compare addresses.

## Text

[`examples/texts.deus`](../../examples/texts.deus) prints, joins, splits and parses numbers
(`parseLoop`), builds a text by `++` in a loop and searches it (`searched`), and sorts generated keys
by insertion with `<=` (`sorted`). Every program agrees with the interpreter and ends with 0 live
words, natively and in wasm built through C.

| Program (best of three)      | CEK interpreter | TS kernel with JIT | wasm in V8 | C, clang -O2 | C, gcc -O2 |
| ---------------------------- | --------------: | -----------------: | ---------: | -----------: | ---------: |
| `Texts.parseLoop 200 5000 0` |        1,640 ms |             268 ms |     107 ms |        47 ms |      40 ms |
| `Texts.searched 200000`      |          250 ms |              76 ms |      29 ms |        18 ms |      17 ms |
| `Texts.sorted 3000`          |          969 ms |             138 ms |      44 ms |        37 ms |      29 ms |

Native code is 4–6× faster than the JIT here, less than on integers, because the JIT's strings are
V8's, whose operations are already native.

Interpreter and JIT times are a `deus eval` minus a `deus eval 1`, which removes start-up; wasm
times are the call alone, in Node. Appending to a unique text writes in place, so the loop that builds
a text of 200,000 phrases is linear: before that, each `++` copied the whole text, and 5,000 phrases
took 514 ms natively.

Core has no types, so two definitions that differ only in their annotations share a hash
(`Sorting.checkGo` on `Int`, `Texts.orderedGo` on `Text`). The store keeps one scheme per hash, and
it was the last one added, so the C back end compiled the other's comparisons wrongly. Now the stored
scheme fits both (`a -> Int -> List a -> Int`, [D116](../DECISIONS.md)), and comparisons on a type
variable are decided at run time.

## Maps

`Dict` and `MutMap` are one block of kind `K_TABLE`: `[size, used, entries, index]`. `entries` is an
array of key-value pairs in insertion order, and `index` an open-addressed array of entry numbers,
at most half full. A delete marks its entry, and growth moves the live entries to new arrays, so
`keys` returns them in the order the kernels do: a key set again after its delete moves to the end.
Keys are `Int` or `Text`, as in the kernels. `Map` is prelude code, an AVL tree; its keys are type
variables, so they compare at run time, which works for `Int` and `Text`.

[`examples/tables.deus`](../../examples/tables.deus) counts words, deletes and sets keys again, builds
a `Dict` from pairs and fills a `Map`. Every program agrees with the interpreter and ends with 0 live
words, natively and in wasm built through C.

| Program (best of three)    | TS kernel with JIT | C, clang -O2 |
| -------------------------- | -----------------: | -----------: |
| `Tables.wordCounts 300000` |           2,250 ms |        16 ms |

The JIT time is a `deus eval` minus a `deus eval` of one word.

## Rendering values

`show` renders as the kernels do: numbers and booleans as JavaScript prints them, texts as JSON,
lists, pairs, options and arrays in their own forms, other data as `(name field…)` where the name is
the first 8 characters of the type's hash and the tag, and functions, refs and tables as
`<function>`. The C back end knows every type at compile time, so it writes one `deus_showK` per type
a program shows, as it does for comparisons (D117); each appends to one unique text, which grows in
place. A value whose type the compiler does not know is refused, since an `Int` and a `Bool` look the
same at run time. [`examples/rendered.deus`](../../examples/rendered.deus) shows nested data with
texts that need escaping and a surrogate pair, and digests the result; it agrees with the
interpreter and ends with 0 live words. `Text.sha256` agrees with `sha256sum` at every padding
boundary.

## Effect handlers

Most clauses resume once, as their last step (`k (x * 2)`), or never (`throw e -> _ => …`). Neither
needs a captured continuation, so the C back end rewrites handlers into Core over a small runtime
before lambda lifting ([D123](../DECISIONS.md)):

- A handler pushes one record per clause, `[parent, frame, ability, op, clause]`, where the clause is
  a closure of its arguments. Performing finds the innermost record for the operation, hides that
  handler and the ones inside it, and calls the clause; its tail `k x` returns `x` to the performer.
- Any other tail aborts: it stores its value for the handler and returns the abort marker, a word no
  program makes. Every call that may return it is bound and checked, and the check returns the
  marker on, so reference counting drops what each frame owns on the way up. The handler takes the
  stored value as its result. A function that cannot reach a perform, a handler or an unknown call
  is not checked, and neither is any code when no clause aborts.
- A clause that resumes anywhere else, or stores its continuation, is refused.

[`examples/handled.deus`](../../examples/handled.deus) counts through a tail-resuming handler, throws
from deep recursion to `try`, keeps state in a `Ref` under a handler that a `throw` passes through,
and throws from inside a clause to a handler that throws again. Every program agrees with the
interpreter and ends with 0 live words, natively and in wasm built through C.

| Program (best of three)   | TS kernel with JIT | C, clang -O2 |
| ------------------------- | -----------------: | -----------: |
| `Handled.countTo 1000000` |           1,040 ms |         8 ms |
| `Handled.unwound 200000`  |             430 ms |        17 ms |

JIT times are a `deus eval` minus a `deus eval` of a tiny input.

## Benchmarks

[`examples/bench.deus`](../../examples/bench.deus) has four first-order programs: `fib` (doubly
recursive calls), `collatz` (tail loops over integer arithmetic), `trees` (building and walking
complete binary trees of depth 16: allocation and matching) and `queens` (search over cons lists).
Times are milliseconds, the best of three, on the cloud sandbox (Node 22, clang 18, gcc 13).
Interpreter and JIT times are a `deus eval` run minus the same run on `fib 1`, which removes
start-up. C times include starting the process, about 1 ms.

| Program          | CEK interpreter (TS, `DEUS_JIT=0`) | Rust kernel | TS kernel with JIT (D39) | wasm in V8 | C, clang -O2 | C, gcc -O2 | Hand-written JS |
| ---------------- | ---------------------------------: | ----------: | -----------------------: | ---------: | -----------: | ---------: | --------------: |
| `fib 30`         |                                730 |       1,006 |                      183 |        6.7 |            7 |          3 |             8.7 |
| `collatz 100000` |                              4,075 |       7,142 |                      544 |       31.5 |           44 |         33 |            31.7 |
| `trees 20`       |                              2,613 |       2,277 |                      501 |       31.2 |           30 |         27 |            44.9 |
| `queens 10`      |                                666 |       1,370 |                      118 |        7.0 |            8 |          7 |             9.6 |

Larger sizes, compiled back ends only:

| Program     | wasm in V8 | C, clang -O2 | C, gcc -O2 | Hand-written JS |
| ----------- | ---------: | -----------: | ---------: | --------------: |
| `fib 35`    |         74 |           54 |          6 |              97 |
| `trees 200` |        332 |          272 |        247 |             450 |
| `queens 11` |         38 |           30 |         29 |              53 |

All back ends agree on every result (`fib 35` = 9227465, `collatz 100000` = 10753840,
`trees 200` = 26214200, `queens 11` = 2680). `collatz` stops at 100000 because Collatz paths from
113383 up exceed 32 bits, and DEUS `Int` wraps there.

## What the numbers say

- **Compiling is the step that matters.** Compiled code is 12–26× faster than the JIT and 83–104×
  faster than the CEK interpreter on these programs. The JIT gains 4–7.5× over the interpreter;
  everything it cannot remove (boxed values, closures for every lambda, the machine around each
  call) is what a compiler removes.
- **For this subset, C and wasm are close.** clang's code is up to 1.4× faster than the same program
  as wasm in V8, and slower on `collatz`. gcc is up to 12× faster on `fib`, because it inlines the
  recursion into itself; that is the C compiler's work, not the back end's. DEUS code compiled to
  wasm already runs at near-native speed wherever V8 runs, and the C back end matters for
  executables without Node, start-up time, and the optimizations of two mature compilers.
- **Both compiled back ends beat hand-written JS** on `trees` and `queens`, because blocks are
  untagged words and nullary constructors are not allocated.
- **The Rust kernel interpreter is slower than the TypeScript one** on three of four programs,
  without the JIT. Its value is size and portability (D40), not speed.
- **Memory was the next limit, and the C back end now frees.** Without it, `trees 200` allocated
  13 million blocks and freed none (301 MB resident). With reference counting and reuse it peaks
  at 2 MB of heap
  ([Memory](#memory)), and wasm built through C does the same ([Wasm through C](#wasm-through-c)).

## Toward the whole language

The best achievable speed for first-order DEUS is what C compilers give, and the back end reaches
it now. The rest of the language needs these, in order of how much code they unlock:

1. **Memory: precise reference counting with reuse** (Perceus, as in Koka and Lean 4): done in the
   C back end (D86) and in wasm built through it (D90). The same uniqueness check makes the pure
   `Array.set` write in place (D96): an array whose count is one is written, a shared one copied.
2. **Closures and partial application:** done (D111). Lambdas are flat closures, known calls
   stay direct C calls, and `letrec` is lambda-lifted, so recursion never builds a closure that
   holds itself.
3. **Text and the other primitives:** `Text` done (D115), with the kernels' UTF-16 semantics,
   ported from the Rust kernel's `text.rs`; structural equality and order of data (D117).
   Insertion-ordered maps (`Dict`, `MutMap`) and `Map` (D119); `show`, `Text.utf8`, `Text.fromCodes`
   and `Text.sha256` (D120).
4. **Effects.** Clauses that resume in tail position or abort: done (D123), without evidence
   passing. The rest of this item is the plan for the general case. Types carry effect rows, so the compiler knows which functions can perform an
   operation. Functions with an empty row compile as they do now. Handlers compile by evidence
   passing (Koka): a handler is a record passed to the code under it. An operation whose handler
   resumes once in tail position (most of them: state, readers, logging, metrics, `Throw` aborts)
   becomes a direct call. A general one-shot resumption runs the handled code on its own stack and
   switches stacks to resume, as OCaml 5 fibers and `libmprompt` do. A continuation resumed more
   than once falls back to copying that stack segment or, as the JIT does (D39), to the CEK
   machine.

Direct LLVM IR, Cranelift and wasm AOT were considered and rejected for now (D80).

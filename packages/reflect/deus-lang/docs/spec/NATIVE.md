# Native compilation: the C back end and how fast DEUS can get

`deus build <fn> -o <file> --c` compiles one definition, and every definition it calls, from
[Core](./CORE.md) to C, then runs `$CC` (default `cc`) at `-O2` to make an executable
([D80](../DECISIONS.md)). With `-o <file>.c` it writes only the C. The compiler is DEUS code,
[`deus/cgen.deus`](../../deus/cgen.deus). With clang as `$CC`, LLVM does the optimizing, so this is
also the LLVM path.

## The subset

The C back end accepts exactly the first-order subset of the [wasm compiler](./WASM.md#the-subset)
and reuses its gathering and type tracking, so a program compiles to both or to neither: literals,
locals, `let`, `seq`, `if`, `match`, constructors, the integer and comparison primitives, and
saturated calls of other such definitions. Error messages for refused forms name the C subset, except
the ones raised while gathering definitions, which name the wasm subset they share.

## The C it writes

| Core                             | C                                                                                                  |
| -------------------------------- | -------------------------------------------------------------------------------------------------- |
| a definition of arity n          | `static V fᵢ(V l0, …, V lₙ₋₁)`; `V` is `intptr_t`                                                  |
| `(int n)`                        | `(V)n`                                                                                             |
| `Int.add`, `sub`, `mul`          | `ADD(a, b)` …: computed in `uint32_t`, sign-extended back, so arithmetic wraps at 32 bits          |
| `Int.div`, `Int.mod`             | `DIV`, `MOD`: trap on zero; `x / -1` is `0 - x`, as in the interpreter                             |
| comparisons, `and`/`or`/`xor`    | the C operator on `V`s, cast back to `V`                                                           |
| `(con "T" tag 0)`                | `(V)&deus_nullary[tag]`: one static block per tag, never allocated                                 |
| `(app (con "T" tag n) a…)`       | a counted block `[tag, a…]` (see [Memory](#memory)), or a dead block's memory reused               |
| `match`                          | one `do { tests; body } while (0)` per case; a failed test `break`s to the next case               |
| `let`, `seq`, `match` (non-tail) | GNU statement expressions `({ … })` (clang and gcc)                                                |
| call to itself in tail position  | arguments into temporaries, then the parameters, then `goto top`                                   |
| other tail call, same arity      | `MUSTTAIL return fⱼ(…)`: `__attribute__((musttail))`, a guaranteed jump, where the compiler has it |
| other call                       | `fⱼ(…)`                                                                                            |

The named definition is also exported as `int32_t <name>(int32_t …)`, and `-DDEUS_MAIN` (which
`deus build` passes) adds a `main` that reads each argument as an integer and prints the result as
one. A constructed result prints as its address.

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
  earlier argument's use.
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
  C stack. Freed blocks of up to 256 words go to a free list per size; larger ones (long arrays)
  are not reused yet. `Ref` cycles are never freed.

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
`benchArray` uses more memory for the same reason. A 32-bit value with a tag bit would halve both
(task in the codebase). `--wasm` stays the default: it needs no clang and is what the browser
build uses.

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
2. **Closures and partial application:** closure conversion to flat closures; known calls stay
   direct C calls.
3. **Text and the other primitives:** a C runtime with the kernels' semantics (UTF-16 text,
   insertion-ordered maps), ported from the Rust kernel's `text.rs` and `prims.rs`.
4. **Effects.** Types carry effect rows, so the compiler knows which functions can perform an
   operation. Functions with an empty row compile as they do now. Handlers compile by evidence
   passing (Koka): a handler is a record passed to the code under it. An operation whose handler
   resumes once in tail position (most of them: state, readers, logging, metrics, `Throw` aborts)
   becomes a direct call. A general one-shot resumption runs the handled code on its own stack and
   switches stacks to resume, as OCaml 5 fibers and `libmprompt` do. A continuation resumed more
   than once falls back to copying that stack segment or, as the JIT does (D39), to the CEK
   machine.

Direct LLVM IR, Cranelift and wasm AOT were considered and rejected for now (D80).

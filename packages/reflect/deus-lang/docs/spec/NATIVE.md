# Native compilation: the C back end and how fast DEUS can get

`deus build <fn> -o <file> --c` compiles one definition, and every definition it calls, from
[Core](./CORE.md) to C, then runs `$CC` (default `cc`) at `-O2` to make an executable
([D79](../DECISIONS.md)). With `-o <file>.c` it writes only the C. The compiler is DEUS code,
[`deus/cgen.deus`](../../deus/cgen.deus). With clang as `$CC`, LLVM does the optimizing, so this is
also the LLVM path.

## The subset

The C back end accepts exactly the first-order subset of the [wasm compiler](./WASM.md#the-subset)
and reuses its gathering and type tracking, so a program compiles to both or to neither: literals,
locals, `let`, `seq`, `if`, `match`, constructors, the integer and comparison primitives, and
saturated calls of other such definitions. Error messages for refused forms name the C subset, except
the ones raised while gathering definitions, which name the wasm subset they share.

## The C it writes

| Core                             | C                                                                                         |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| a definition of arity n          | `static V fᵢ(V l0, …, V lₙ₋₁)`; `V` is `intptr_t`                                         |
| `(int n)`                        | `(V)n`                                                                                    |
| `Int.add`, `sub`, `mul`          | `ADD(a, b)` …: computed in `uint32_t`, sign-extended back, so arithmetic wraps at 32 bits |
| `Int.div`, `Int.mod`             | `DIV`, `MOD`: trap on zero; `x / -1` is `0 - x`, as in the interpreter                    |
| comparisons, `and`/`or`/`xor`    | the C operator on `V`s, cast back to `V`                                                  |
| `(con "T" tag 0)`                | `(V)&deus_nullary[tag]`: one static block per tag, never allocated                        |
| `(app (con "T" tag n) a…)`       | a block `[tag, a…]` of `n + 1` words from a bump allocator that never frees               |
| `match`                          | one `do { tests; body } while (0)` per case; a failed test `break`s to the next case      |
| `let`, `seq`, `match` (non-tail) | GNU statement expressions `({ … })` (clang and gcc)                                       |
| call to itself in tail position  | arguments into temporaries, then the parameters, then `goto top`                          |
| other tail call, same arity      | `__attribute__((musttail)) return fⱼ(…)`, a guaranteed jump under clang                   |
| other call                       | `fⱼ(…)`                                                                                   |

The named definition is also exported as `int32_t <name>(int32_t …)`, and `-DDEUS_MAIN` (which
`deus build` passes) adds a `main` that reads each argument as an integer and prints the result as
one. A constructed result prints as its address.

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
- **What remains on the compiled path is memory.** `trees 200` allocates 26 million blocks and
  frees none: 630 MB in C, where a word is 8 bytes, and half that in wasm. Nothing is reclaimed
  yet, so long-running programs need a memory manager before anything else.

## Toward the whole language

The best achievable speed for first-order DEUS is what C compilers give, and the back end reaches
it now. The rest of the language needs these, in order of how much code they unlock:

1. **Memory: precise reference counting with reuse** (Perceus, as in Koka and Lean 4). DEUS values
   are immutable and cycles arise only through `letrec` and `Ref`, so counts are exact and a
   unique block can be updated in place (`List.map` on an unshared list reuses its cells). A
   tracing collector (Boehm) is a stop-gap that needs no compiler work.
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

Direct LLVM IR, Cranelift and wasm AOT were considered and rejected for now (D79).

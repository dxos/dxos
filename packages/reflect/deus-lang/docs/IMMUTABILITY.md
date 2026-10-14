# Does immutability make DEUS slow? A sorting case study

Dmytro asked whether writing programs functionally, with immutable data, leads to fundamentally
inefficient code, and whether DEUS needs mutable memory ([USER.md](./USER.md)). This note answers
with measurements and recommends a design, recorded as [D83](./DECISIONS.md).

## Short answer

1. **Not fundamentally.** Every pure sort here is O(n log n), the same as an in-place sort. Sorting
   has no asymptotic gap between pure and mutable code.
2. **The constant factors are real, and memory is the bigger one.** Compiled to wasm, the best pure
   sort is 2–3× slower than the in-place sort (3.4× compiled to C) and allocates 17–26× more memory. The wasm back end
   never frees memory, so a pure sort of 10 million numbers would need about 5 GB, beyond wasm32's
   4 GB. That program cannot run at all today.
3. **DEUS needs O(1) writes, but not mutation in the language.** D83 added a mutable `Array`; D95
   replaced it with a pure one. `Array.set` returns a new array, and compiled code writes in place
   whenever nothing reads the old array again. The pure quicksort now runs as fast as the mutable
   one did (see [the update](#update-the-pure-array-d86)).

## Update: the pure array (D95)

Dmytro asked for the recommendation to be built. It is: the `--wasm` back end finds unique arrays
statically, and the C back end by the reference counts it gained in D86.

- **The language.** `Array.set : Array a -> Int -> a -> Array a` returns a new array; the old one
  is unchanged. Arrays compare by their items. The spec, with the laws as theorems, is
  [`docs/spec/ARRAY.mdl`](./spec/ARRAY.mdl): seven laws are proved, three are tested.
- **The kernels** keep versions (Baker's persistent arrays with Conchon and Filliâtre's rerooting):
  the newest version owns the items, each older one is a diff. A program that only writes to the
  newest array pays O(1) per operation; one that reads an old version pays to move back to it.
  Nothing needs journaling for the JIT any more, since a write creates a value instead of changing one.
- **Compiled wasm** (`--wasm`) has one block per array and never frees. A Core-to-Core pass,
  [`deus/unique.deus`](../deus/unique.deus), proves where a `set` is the last use of its array and
  writes in place there; elsewhere it copies ([WASM.md](./spec/WASM.md#unique-arrays)). The pure
  quicksort compiles with no copy at all.
- **C** (and wasm built through it, D90) counts references: a `set` writes in place when the count
  is one and copies a shared array.

Pure quicksort over `Array`, n = 1 000 000, against the D83 mutable one:

|                    | D83 mutable    | D95 pure                                          |
| ------------------ | -------------- | ------------------------------------------------- |
| wasm               | 202 ms, 18 MiB | **187 ms, 23 MiB**                                |
| C (clang `-O2`)    | 153 ms         | **142 ms** without counts; 200 ms with them (D86) |
| TS kernel, n = 10⁵ | 914 ms         | 935 ms                                            |
| Rust kernel, 10⁵   | 3 558 ms       | 3 983 ms                                          |

The 5 MiB more in wasm is the pair `lomuto` returns per partition, since the pure version returns the
array with the pivot's place. The kernels are within noise of the mutable version on the JIT and
12% slower on the Rust kernel, where each write allocates a version node.

**Why two mechanisms.** The `--wasm` back end represents every value as one 32-bit word with no
header and never frees, so there is no count to read; a static pass needs neither and costs nothing
at run time. The C back end has counts (D86), and the count is the more precise test, so it checks
it at each `set`. In C the counting costs about 40% on this sort (200 ms against 142 ms), which
buys freeing every block.

## What was measured

These measurements are from D83 (`9c961d95`), when `Array` was mutable; D95 removed the
`Persistent` sort from the example, since the pure `Array` now is the persistent array.

[`examples/sorting.deus`](../examples/sorting.deus) sorts pseudo-random `Int`s with seven programs.
All of them are first-order, so the same definitions run on the interpreter and compile to wasm.

| Sort         | Style                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------- |
| `Merge`      | bottom-up merge sort on immutable lists                                                      |
| `Quick`      | quicksort on immutable lists, with an accumulator instead of `++`                            |
| `Heap`       | heap sort through a persistent leftist heap                                                  |
| `Array`      | in-place Lomuto quicksort on the new mutable `Array`                                         |
| `Persistent` | the same in-place quicksort through a **pure** interface: a persistent array (Baker's trick) |
| `Prelude`    | `List.sort`, the prelude's generic merge sort (interpreters only: it takes a closure)        |
| `Map`        | the in-place quicksort over `MutMap Int Int`, the mutable memory DEUS had already            |

[`scripts/sort-bench.mjs`](../scripts/sort-bench.mjs) runs each on the TypeScript kernel (with its
JIT), the Rust kernel, and as a compiled wasm module under Node 22; the C back end is timed by hand. It compares them with the same
algorithms in JavaScript. Times are the best of three runs, minus the time to generate the input.
For wasm, "allocated" is the heap pointer after the run, which counts every byte the program
allocated, since nothing is freed.

### Compiled wasm, against JavaScript

| n         | Merge (list)    | Quick (list)    | Heap (persistent) | **Array (in place)** | Persistent (pure API) |
| --------- | --------------- | --------------- | ----------------- | -------------------- | --------------------- |
| 10 000    | 4.5 ms, 3.2 MiB | 3.4 ms, 1.9 MiB | 7.7 ms, 4.1 MiB   | **1.4 ms, 0.2 MiB**  | 7.2 ms, 5.1 MiB       |
| 100 000   | 46 ms, 40 MiB   | 39 ms, 25 MiB   | 127 ms, 53 MiB    | **16 ms, 1.8 MiB**   | 85 ms, 61 MiB         |
| 1 000 000 | 554 ms, 470 MiB | 423 ms, 302 MiB | 2 272 ms, 656 MiB | **202 ms, 18 MiB**   | 965 ms, 766 MiB       |

Native, through the C back end ([D80](./DECISIONS.md), clang `-O2`), at n = 1 000 000 (best of three,
minus 17 ms to generate the input): Merge 862 ms, Quick 522 ms, Heap 1 843 ms, **Array 153 ms**,
Persistent 1 153 ms. The list sorts are slower native than in wasm. Words are 8 bytes there, so they
touch twice the fresh memory, and the time goes to page faults on memory that is never reused.

| n         | JS cons-list merge | JS cons-list quick | JS `Int32Array` quick | JS `Int32Array.sort` |
| --------- | ------------------ | ------------------ | --------------------- | -------------------- |
| 10 000    | 5.4 ms             | 3.5 ms             | 1.4 ms                | 0.8 ms               |
| 100 000   | 71 ms              | 63 ms              | 19 ms                 | 15 ms                |
| 1 000 000 | 3 051 ms           | 1 265 ms           | 337 ms                | 373 ms               |

### Interpreters (ms) and machine steps

| Sort       | TS kernel, 10⁴ | TS kernel, 10⁵ | Rust kernel, 10⁴ | Rust kernel, 10⁵ | Steps, 10⁴ |
| ---------- | -------------- | -------------- | ---------------- | ---------------- | ---------- |
| Merge      | 50             | 356            | 178              | 2 925            | 0.89 M     |
| Quick      | 15             | 357            | 138              | 2 048            | 0.59 M     |
| Heap       | 74             | 1 051          | 560              | 8 123            | 5.66 M     |
| Array      | 95             | 914            | 277              | 3 558            | 2.28 M     |
| Persistent | 370            | 3 570          | 758              | 9 496            | 5.84 M     |
| Prelude    | 70             | 726            | 464              | 5 794            | 2.40 M     |
| Map        | 170            | 2 196          | 554              | 6 528            | 4.58 M     |

Timings at 10⁴ on the interpreters are within process-start noise (about ±30 ms); the step counts
are exact and the same on both kernels.

## What the numbers say

**Pure code is not where the time goes; allocation is.** The same immutable merge sort runs 5.5×
faster as DEUS-compiled wasm (554 ms) than as JavaScript (3 051 ms). The algorithm and the data
structure are identical. The difference is that wasm allocates by bumping a pointer and never runs
a collector, while V8 spends most of the JavaScript run in garbage collection. "Functional is slow"
mostly means "allocating is slow".

**In place wins 2–5× on time and 17–26× on memory, once compiled.** Native code shows it most:
the in-place sort is 3.4× faster than the list quicksort and 5.6× faster than merge sort. The in-place `Array` sort
(202 ms at 10⁶) is 2.1× faster than the list quicksort and 2.7× faster than merge sort. It matches
V8's native `Int32Array.sort`. Memory is the larger effect: 18 MiB against 302–470 MiB. Because the
wasm heap is never freed, the allocation is the peak footprint. A merge sort of n numbers allocates
about 24 · n · log₂ n bytes, so 10⁷ numbers need about 5.6 GB. Under wasm32's 4 GB limit that
program cannot run.

**On the interpreters, mutation does not help.** The in-place sort takes 2.3 M steps against
0.6–0.9 M for the list sorts, because each `Array.get` and `Array.set` is a call through a builtin
wrapper and dispatch dominates. On the TypeScript kernel each write while compiled also journals a
closure so a deoptimisation can roll it back (D39). The interpreter is the wrong place to look for
the cost of immutability.

**A pure interface over mutation costs too much without help from the runtime.** The persistent
array keeps the type pure: each `set` returns a new version, and old versions stay readable. It is
O(1) per operation when versions are threaded linearly. But every write allocates a diff node, a
cell and a new root. Compiled, it is 4.8× slower than the raw `Array` and allocates more than merge
sort. On the interpreters it is the slowest sort. Running it also found a Rust-kernel bug: dropping
a long chain of `Ref` cells recursed and overflowed the stack. It is fixed in this commit
(`Con::drop` now unlinks through `Ref` cells iteratively).

**What does not show up in sorting.** Some problems do have a gap. A pure strict language can be
Θ(log n) slower than one with mutable memory for some online problems (Pippenger, 1997). Union-find,
hash tables, dynamic-programming tables and graph search all want O(1) indexed writes. The pure
substitutes (`Map`, a balanced tree) cost O(log n) per access. Sorting is the friendly case, and it
already shows a 2–3× gap in time and a 20× gap in memory.

## Recommendation (D83)

Add mutable memory, but in a form that keeps DEUS pure where it matters: hashing, cached test
results, the prover, and multi-shot handlers. Do it in two steps.

1. **Now: a mutable `Array` primitive** (`Array.make`, `length`, `get`, `set`), done in D83 (replaced by step 2 in D95).
   It worked like `Ref` and `MutMap`: identity-compared, not rolled back by a resumed
   continuation, and outside the prover's pure primitives, so a theorem over it is tested rather
   than proved. Both kernels implement it identically. The wasm and C back ends compile it to a block
   `[length, item…]` with a bounds check that traps. They now also compile `Ref`, and inline calls
   to primitive-only definitions such as `Int.and`, which they used to refuse. Library
   code that needs speed (the compiler, the codebase store, the type checker's unifier) can use
   `Array` today, as it already uses `Ref`.
2. **Next: a pure `Array` that is updated in place when it is unique.** Done in D95, see
   [the update](#update-the-pure-array-d86). `Array.set : Array a -> Int -> a -> Array a` returns a
   new array and leaves the old one unchanged; compiled code writes in place when it can prove
   nobody else holds the old array, as in Lean 4's `Array` and Koka's "functional but in-place".

Rejected alternatives:

- **Stay pure-only.** Measured above: 2–3× slower, 20× the memory, and a hard ceiling on input size
  in wasm.
- **Effect-scoped mutation (Haskell's `ST`, or a `Mut` ability with a `run` handler).** Keeping an
  array from escaping its scope needs rank-2 types, which DEUS does not have. Every helper's
  signature would also carry the ability. Koka chose in-place reuse over this for the same reasons.
- **Linear or uniqueness types in the surface language (Clean, Rust).** These give the same in-place
  writes as step 2, but they put the bookkeeping on whoever writes the code, agents included.
  Reference counting finds uniqueness at run time without annotations.
- **A persistent array as the only array.** Measured above: pure, but it allocates on every write
  and is 4.8× slower than the raw `Array` compiled.

## Follow-up tasks

These are filed in the codebase's task list ([`codebase/TASKS.md`](../codebase/TASKS.md)).

- Reference counting with reuse (Perceus) in the wasm and C back ends, so pure code frees memory
  and reuses unique cells in place (native-compilation work, tasks `62d1bdda` and `cf0e3937`). With
  counts, the copying `Array.set` should check for a count of one before copying.
- Done in D95: a pure `Array.set` that writes in place when the array is unique, and no JIT
  journaling for `Array` writes.

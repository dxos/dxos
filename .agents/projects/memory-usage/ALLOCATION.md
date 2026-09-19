# Where Composer's memory goes, for a JavaScript developer

Every number here is a footprint delta measured with
`packages/apps/composer-app/scripts/memory/ledger.mjs --detached` against a
production build, Chromium 153, macOS. Footprint is what the OS charges the
renderer process. It is the only quantity worth trending; see the harness
[README](../../../packages/apps/composer-app/scripts/memory/README.md) for why
the allocator numbers alone mislead.

Measure with `--detached`. A Playwright-driven page adds ~130 MB of its own.

## What a thing costs

Each row is one controlled fixture, one variable, measured as the change in
process footprint.

| What you do                                                            | Footprint cost | Where it lands                 |
| ---------------------------------------------------------------------- | -------------- | ------------------------------ |
| Hold 1 MB in an `ArrayBuffer` or `Uint8Array`, anywhere in the process | **1.0 MB**     | `partition_alloc`, exactly 1:1 |
| Touch 1 MB of `WebAssembly.Memory`                                     | **1.0 MB**     | no allocator node at all       |
| Ship one more ES module                                                | **~24 KB**     | `malloc`                       |
| Make one more HTTP request while loading                               | **~6.6 KB**    | `malloc`                       |
| Ship one more function                                                 | **~0.5 KB**    | `v8`                           |
| Spawn one dedicated worker                                             | **~2.6 MB**    | `v8` and `malloc`              |
| One element carrying 6 CSS custom properties                           | **~1.3 KB**    | `malloc`                       |
| One element carrying a 200-character Tailwind class list               | **~0.4 KB**    | `malloc`                       |

Two of these are worth internalising because they are counter-intuitive.

**Binary data costs the same wherever it lives.** Holding 80 MB of
`ArrayBuffer` inside a dedicated worker moved the renderer's `partition_alloc`
by 80.00 MB. Dedicated and shared workers run inside the creating renderer
process, so moving bytes into one moves the work, never the memory. Only a
service worker gets a process of its own.

**A long class list is nearly free; a CSS variable is not.** 3,000 elements with
200-character Tailwind class lists cost 1.25 MB over 3,000 elements with a
one-character class. The same 3,000 elements with six CSS custom properties each
cost 4.0 MB. Custom properties are roughly three times the price of the class
list, per element.

## What Composer spends it on

An idle tab, fresh profile, nothing opened: **445 MB** in the app's renderer.

### Binary data — 124 MB

`partition_alloc` is 124.5 MB. The fixture proves one direction: `ArrayBuffer`
bytes land there one for one. It does not prove the converse, that everything in
that node is an `ArrayBuffer`, and 90 MB of it reports as `<unspecified>` with no
provider claiming it. So read this as the leading explanation rather than a
closed case: binary data our code holds, most likely automerge document bytes,
sync payloads and SQLite pages.

Two things support it. No synthetic fixture moved the node except the buffer one:
3,000 DOM elements, 927 modules and four workers all left it at roughly 1 MB. And
it tracks how much SDK is running rather than how much UI:

|                                                     | `partition_alloc` |
| --------------------------------------------------- | ----------------- |
| `recovery.html`, ECHO client, no plugins, no UI     | 20.6 MB           |
| `todomvc`, same SDK and worker topology, minimal UI | 53.6 MB           |
| `composer`                                          | 124.5 MB          |

This is the largest single slice and the most clearly addressable: it is bytes
our own code chose to keep.

### Just having the code — 97 MB

Composer loads 927 scripts containing 57,354 functions and 12.55 MB of source,
counted with `Profiler.takePreciseCoverage`.

A synthetic page with that exact shape, 927 modules and 56,547 functions and
13.28 MB of source, doing nothing at all, costs **96.9 MB**. No React, no DOM, no
workers, no network beyond fetching the modules.

That is the floor for shipping this much code in this many pieces. It splits
roughly 37 MB `malloc`, 18 MB `v8`, and the rest baseline renderer.

Per-module overhead dominates per-byte: the same 1.95 MB of JS costs 42.9 MB as
one module and 73.6 MB as 1,000 modules. A control that fetches the same 1,000
files and throws the text away costs 6.6 MB, so roughly a fifth of that gap is
the requests and the rest is what V8 keeps per module record.

### The JS objects you would expect — 82 MB

Live JS heap across every realm. The synthetic code-shape page carries 15.6 MB of
that just from module namespaces, so roughly 66 MB is objects Composer's own code
built. Sampled allocation attributes most of it to two packages, `effect` at
18.6 MB and `@dxos/echo` at 10.9 MB.

### DOM, styles and the perf timeline — 32 MB

`blink_gc` holds the DOM and CSSOM. Composer's DOM is small at rest, 3,055
elements, so element count is not the driver. The single largest named object in
it is **`PerformanceMeasure` at 6.5 MB**, plus 0.8 MB of `PerformanceMark`. There
are 2,094 live marks and 1,750 measures at idle against todomvc's 7 and 14, and
nothing clears them.

### WebAssembly — 4 MB idle, 165 MB loaded

Invisible to every allocator node and to every JS heap API. The harness measures
it by shimming `WebAssembly.Memory`. At rest it is small. With 200 tasks and 3
documents open it reaches 165 MB, of which automerge is 143 MB across three
separate instances, because the bundle ships two distinct automerge Rust binaries
and the tab runs its own replica alongside the worker's.

## Budget

|                            | MB  | how it was established                    |
| -------------------------- | --- | ----------------------------------------- |
| Binary data held in JS     | 124 | `partition_alloc`; 1:1 fixture, inferred  |
| Having the code            | 97  | synthetic same-shape page                 |
| App JS objects beyond that | 66  | live heap minus the fixture's heap        |
| DOM, CSSOM, perf timeline  | 32  | `blink_gc`, named by Blink class          |
| Compositor and GPU handles | 45  | shared-backed, charged to the GPU process |
| WebAssembly                | 4   | `WebAssembly.Memory` shim                 |
| Unattributed               | ~77 |                                           |

The first three rows overlap at the edges, because the code-shape fixture carries
its own small heap and allocator baseline. Treat the budget as approximate and
the per-unit table as exact.

## What this says to do

1. **Stop holding 124 MB of binary data at rest.** Largest slice, our own code,
   and it grows with the SDK rather than with what the user has open.
2. **Clear the perf timeline.** 7.3 MB, named, idle, with no reader.
3. **Ship fewer modules.** 927 of them cost roughly 22 MB in per-module overhead
   plus 6 MB in requests, independent of the bytes inside.
4. **Collapse the duplicate automerge instances.** Two Rust binaries plus a
   tab-side replica, 143 MB committed once data is open.
5. **Prefer a long class list over CSS custom properties** where the choice
   exists. Three times cheaper per element.

## Reproducing

Serve production builds; numbers from `vite serve` are not comparable. Run the
ledger from `packages/apps/composer-app`, which is what the relative paths below
are written against.

```bash
moon run composer-app:bundle
moon run todomvc:bundle
pnpm --filter @dxos/composer-app exec vite preview --port 4173 &
pnpm --filter @dxos/todomvc exec vite preview --port 4174 &

# The headline number.
node scripts/memory/ledger.mjs http://localhost:4173 --detached

# Which package allocates the JS.
node scripts/memory/ledger.mjs http://localhost:4173 --detached --by-code --dist out/composer

# Split SDK cost from app cost against a smaller app on the same SDK.
node scripts/memory/ledger.mjs http://localhost:4174 --detached --ready none --json ./tmp/todomvc.json
node scripts/memory/ledger.mjs http://localhost:4173 --detached --baseline ./tmp/todomvc.json
```

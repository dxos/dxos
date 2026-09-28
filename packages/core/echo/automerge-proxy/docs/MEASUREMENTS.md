# Tab document measurements

What tab documents cost against Automerge replicas, measured with the benches in
[`scripts/bench`](../scripts/bench), which run the package's own code. Replica mode sets the bar: a tab
must be no slower wherever the user waits, and should hold as little memory as it can.

The figures below come from one cloud container on 2026-09-26. The spike that preceded this package
measured 10 to 40% lower absolute figures on a faster run; its bench, run again on this container,
matches the package (the keystroke space loads in 387 ms against 361 and 390 ms).

## Short answer

1. **A tab of tab documents holds less than a replica tab.** In Chromium it takes 12.7 MB for the
   burst space and 21.0 MB for the keystroke space, against 14.3 and 69.8 MB. Three tabs take 37.4 and
   61.9 MB against 41.9 and 208.4 MB.
2. **Dropping the documents frees them.** A tab that drops its documents keeps 2.2 to 2.7 MB. A
   replica tab keeps its wasm memory: 13.9 to 14.0 and 69.4 to 69.5 MB.
3. **Nothing the user waits on is slower.** A write takes 0.37 to 0.39 ms in the tab against 0.40 to
   0.44 ms. Receiving a peer's keystroke and reading the text takes 1.5 to 2.0 ms against 9.9 to
   13.6 ms. Loading the space takes 179 and 361 to 390 ms against 308 and 588 to 591 ms.
4. **The worker takes a tab's change in the time it takes a replica's**, 13.0 to 13.1 ms against 12.8
   to 13.0 ms, nearly all of it Automerge applying the change.

## The test space

200 tasks, three documents of about 45,000 characters, and the space root, typed in 20-character
bursts (7,846 changes) or one change per keystroke (137,831 changes).
[`corpus.mjs`](../../echo-client/docs/worker-only/corpus.mjs) writes it. Every tab shares one worker,
which holds the space in Automerge either way.

## Chromium

`scripts/bench/browser/run.ts` opens one and three tabs against one shared worker. The keystroke
figures cover two runs.

| Per tab                   | Bursts, replicas | Bursts, tab documents | Keystrokes, replicas | Keystrokes, tab documents |
| ------------------------- | ---------------- | --------------------- | -------------------- | ------------------------- |
| Heap, one tab             | 14.3 MB          | 12.7 MB               | 69.8 MB              | 21.0 MB                   |
| Heap, three tabs in all   | 41.9 MB          | 37.4 MB               | 208.4 MB             | 61.9 to 62.0 MB           |
| Kept after dropping all   | 14.0 MB          | 2.7 MB                | 69.5 MB              | 2.7 MB                    |
| Load the space            | 308 ms           | 179 ms                | 588 to 591 ms        | 361 to 390 ms             |
| Write a keystroke         | 0.40 ms          | 0.37 ms               | 0.42 to 0.44 ms      | 0.38 to 0.39 ms           |
| Write, round trip         | 13.8 ms          | 14.2 ms               | 14.1 to 14.2 ms      | 14.0 to 14.1 ms           |
| Worker time for the write | 12.8 ms          | 13.1 ms               | 13.0 ms              | 13.0 to 13.1 ms           |
| Receive a peer keystroke  | 9.9 ms           | 2.0 ms                | 12.0 to 13.6 ms      | 1.5 to 1.8 ms             |

Chrome counts wasm memory in its heap figure, so a replica's heap includes Automerge's linear memory.
Latencies are medians: 200 writes to a long document, and 100 keystrokes from another peer, each
applied and followed by a read of the text. A tab's first write grows only the arrays it touches and
takes 5.5 to 11 ms, against 15 to 20 ms for a replica's first.

## Node

`scripts/bench/memory.ts` loads the space in a fresh worker thread per mode, so each figure is that
realm's heap and external memory above an empty realm's 17.6 MB. Each load is one cold run; the
ranges cover two.

| Mode                           | Bursts, memory | Bursts, load  | Keystrokes, memory | Keystrokes, load |
| ------------------------------ | -------------- | ------------- | ------------------ | ---------------- |
| Replicas                       | 14.2 MB        | 213 to 216 ms | 69.7 MB            | 460 to 484 ms    |
| Tab documents, told the hashes | 13.4 MB        | 111 to 139 ms | 21.7 MB            | 179 to 216 ms    |
| Tab documents, hashing it all  | 13.6 MB        | 0.9 s         | 21.8 MB            | 3.7 s            |
| The worker's check index       | 6.8 MB         | 85 to 97 ms   | 15.0 MB            | 108 to 131 ms    |

Automerge's wasm is 11.7 and 67.2 MB of the replica figures. A tab that hashes every change itself
takes 7 to 20 times longer to load, which is why the snapshot carries the hashes.

## What each fix bought

Five changes brought the spike's first tab document to these figures. Before and after are the
spike's own Chromium runs, one tab, bursts then keystrokes.

| Fix                         | What changed                                                                                           | Before                 | After                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------- | ---------------------- |
| 1. The cached value         | A write applies the draft's ops to the cached value; a remote change diffs only the objects it touched | 2.0 to 2.2 ms a write  | 0.34 to 0.36 ms        |
| 2. Loading                  | Hashes arrive as bytes keyed by actor and seq; the change table fills in one pass                      | 0.4 and 0.9 s in Node  | 172 and 237 ms         |
| 3. Send cadence             | Sends go through `UpdateScheduler` at `RepoProxy`'s rate                                               | One batch per interval | When a replica's would |
| 4. Typed arrays             | Ops and changes in typed-array columns; loaded arrays fit exactly                                      | 20.1 and 32.4 MB       | 12.8 and 20.9 MB       |
| 5. The worker's check index | Each op's object, key or element and kind, plus the change table, in place of a second model           | 12.6 and 20.8 MB, Node | 5.9 and 14.1 MB, Node  |

The index checks and adds a keystroke in 6 to 8 µs. Its change table is two thirds of it for the
keystroke space: 138,000 changes for 202,000 ops. Keeping 16 bytes of each hash, and dropping the
columns only a tab reads, would save about 4 MB more.

## Running the benches

From `packages/core/echo/automerge-proxy`:

```bash
# A corpus: 200 tasks, 3 documents of 400 paragraphs, 20 characters per change (1 for keystrokes).
node ../echo-client/docs/worker-only/corpus.mjs /tmp/burst.json 200 3 400 20

# Memory and load time in Node: replicas, tab documents and the worker's check index.
node --expose-gc --conditions=source scripts/bench/memory.ts /tmp/burst.json

# Memory, load, write and receive latency in Chromium.
node --conditions=source scripts/bench/browser/run.ts /tmp/burst.json --tabs 1,2,3
```

The browser bench uses the pre-installed Chromium at `/opt/pw-browsers/chromium`; set
`CHROMIUM_PATH` to use another.

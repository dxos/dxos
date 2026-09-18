---
'@dxos/echo-host': minor
'@dxos/index-core': minor
---

Index runs driven by local writes now wait for the write burst to settle instead of running on every save.

Each index run re-indexes every object the write touched, and an object's FTS row holds its whole JSON snapshot under a trigram tokenizer, so a single keystroke in a 110KB markdown document rewrote the document's entire index entry — roughly 700KB of SQLite pages and 300ms of worker CPU. Document saves and feed blocks both arrive per keystroke, which made that the per-keystroke cost: six seconds of continuous typing drove 22 re-indexes, 15MB of writes and 6.6s of CPU in the worker.

A save or feed block now schedules its run 500ms after the last write, capped at 2s from the first deferred one so a stream that never pauses still makes progress. Startup, bulk pagination and the `updateIndexes` RPC are unchanged and still run immediately. The visible cost is that a query over a document being actively typed into trails the keystrokes by up to that interval.

`IndexDataSource.getChangedObjects` now returns `done`, reporting whether the source had anything left beyond the batch it returned. The engine previously treated every productive read as incomplete, so each pass that indexed anything paid for a second, empty pass behind it.

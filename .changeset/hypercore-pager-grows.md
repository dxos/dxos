---
'@dxos/vendor-hypercore': patch
---

hypercore's bitfield pagers no longer preallocate 32,768 slots per level: each feed's four pagers cost 128 KB apiece in V8 and 256 KB in JSC however few pages they held, which on a profile with ~120 feeds was 62 MB of the ECHO worker's heap.

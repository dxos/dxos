import * as A from '@dxos/automerge/automerge';
import * as amWasm from '@dxos/automerge/automerge-wasm';

// function getCurrentMemorySize() {
//   return (amWasm as any).__wbindgen_memory().buffer.byteLength;
// }

function preloadMemory(size: number) {
  const buffer = new Uint8Array(size);
  try {
    A.load(buffer); // Will throw because buffer is not a valid Automerge document but the buffer will still be loaded into WASM memory.
  } catch {}
}

const EXPECTED_WASM_MEMORY_SIZE = 1_000_000_000; // 1 GB

export function warmupWasm() {
  // console.log('Memory before warmup', getCurrentMemorySize());
  console.log('Warming up by', EXPECTED_WASM_MEMORY_SIZE, 'bytes...');

  const start = Date.now();
  preloadMemory(EXPECTED_WASM_MEMORY_SIZE);
  const end = Date.now();

  // console.log('Memory after warmup', getCurrentMemorySize());
  console.log('Wasm warmup time', end - start);
}

/*

From https://discord.com/channels/1200006940210757672/1200129380706435112/1242619291497660447

=========================================

I've did some more digging on this. It seems like neither Rust nor wasm-bindgen integrate with the WASM-GC Proposal. I did see the FinalizationRegistry Alex mentioned, and it calls free on Rust objects, deallocating them from the internal WASM heap which is managed by a separate allocator.

Now, a plausible explanation for those GC samples within WASM is that GC runs when WASM memory needs to grow. When dlmalloc (the allocator used in Rust WASM) runs out of free memory pages, it will call the memory.grow WASM instruction, which in turn will cause V8 GC to run, trying to reclaim memory under memory pressure. This gets pretty slow when the allocator requests just a couple 64KB pages at a time (like what happens in my test, which creates a bunch of small objects).

To verify that, I've tried "pre-growing" the WASM memory before the test, by creating a large automerge document and then immediately freeing it.
This should have the effect of leaving a bunch of memory pages committed to WASM but not used.
I've targeted around 20MB increase in WASM memory as that seems to be the relative growth observed after running my tests.

function warmup(bytes) {
  const sizeBefore = temp1[5].buffer.byteLength; // temp1[5] is WebAssembly.Memory instance used by automerge.
    
  const doc = am.from({ x: '10'.repeat(bytes / 128) })
  am.free(doc);

  const newSize = temp1[5].buffer.byteLength

  console.log({ sizeBefore, newSize, diff: newSize - sizeBefore, coef: (newSize - sizeBefore) / bytes })
}


Profiles before and after show positive results: without "pre-growing" creating 100 ECHO objects takes 6.6 seconds with the majority of profiler samples being GC inside WASM stacks. If I "pre-grow" the memory, using the above method, before running the test - the time drops to 800 milliseconds with no GC runs visible. 

*/
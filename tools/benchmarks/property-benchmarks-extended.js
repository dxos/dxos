// Copyright 2025 DXOS.org
//
// Extended Property Access Benchmarks.
// Includes warmup and more realistic scenarios.

const iterations = 1_000_000;

// Classes from original benchmark.
class DirectAccess {
  constructor() {
    this.value = 42;
  }
}

class InnerObject {
  constructor() {
    this.value = 42;
  }
}

class GetterAccess {
  constructor() {
    this.inner = new InnerObject();
  }

  get value() {
    return this.inner.value;
  }
}

class SimpleWrite {
  constructor() {
    this.value = 0;
  }
}

class ImmutableAccess {
  constructor() {
    Object.defineProperty(this, 'value', {
      value: 42,
      writable: false,
      configurable: false,
      enumerable: true
    });
  }
}

// Measures the execution time of a callback, accounting for multiple operations per run.
/** @param {string} name - Label for the benchmark result. */
/** @param {Function} fn - The function to benchmark. */
/** @param {number} runs - Number of iterations to run (default: 1,000,000). */
/** @param {number} opsMultiplier - Operations per run for accurate rate reporting (default: 1). */
/** @returns {number} Duration in milliseconds. */
function benchmark(name, fn, runs = iterations, opsMultiplier = 1) {
  const start = performance.now();
  for (let i = 0; i < runs; i++) {
    fn();
  }
  const end = performance.now();
  const duration = end - start;
  const totalOps = runs * opsMultiplier;
  const opsPerSec = (totalOps / duration * 1000).toFixed(0);
  console.log(`${name.padEnd(50)} ${duration.toFixed(2)}ms  (${opsPerSec} ops/sec)`);
  return duration;
}

// Warmup the JIT compiler.
console.log('Warming up JIT compiler...\n');
const warmupObj1 = new DirectAccess();
const warmupObj2 = new GetterAccess();
const warmupObj3 = new SimpleWrite();
const warmupObj4 = new ImmutableAccess();

for (let i = 0; i < 10000; i++) {
  const _ = warmupObj1.value;
  const __ = warmupObj2.value;
  warmupObj3.value = 42;
  const ___ = warmupObj4.value;
}

console.log('Benchmarks with JIT warmup');
console.log('='.repeat(70));
console.log(`Running ${iterations.toLocaleString()} iterations per test\n`);

const directObj = new DirectAccess();
const getterObj = new GetterAccess();
const writeObj = new SimpleWrite();
const immutableObj = new ImmutableAccess();

console.log('READ benchmarks:');
console.log('-'.repeat(70));

let checksum = 0;

const t1 = benchmark('1. Direct property read', () => {
  checksum += directObj.value;
});
console.log(`  (checksum: ${checksum})`);

checksum = 0;
const t2 = benchmark('2. Getter (reads inner.value)', () => {
  checksum += getterObj.value;
});
console.log(`  (checksum: ${checksum})`);

checksum = 0;
const t4 = benchmark('4. Immutable (Object.defineProperty)', () => {
  checksum += immutableObj.value;
});
console.log(`  (checksum: ${checksum})`);

console.log('\nWRITE benchmarks:');
console.log('-'.repeat(70));

const t3 = benchmark('3. Simple property write', () => {
  writeObj.value = 42;
});

console.log('\n' + '='.repeat(70));
console.log('Summary (relative to direct property read):');
console.log('-'.repeat(70));
console.log(`Direct read:                ${(t1 / t1).toFixed(2)}x (baseline)`);
console.log(`Getter read:                ${(t2 / t1).toFixed(2)}x (${((t2 / t1 - 1) * 100).toFixed(1)}% slower)`);
console.log(`Simple write:               ${(t3 / t1).toFixed(2)}x (${((t3 / t1 - 1) * 100).toFixed(1)}% slower)`);
console.log(`Immutable read:             ${(t4 / t1).toFixed(2)}x (${((t4 / t1 - 1) * 100).toFixed(1)}% slower)`);

console.log('\n' + '='.repeat(70));
console.log('Additional insights:');
console.log('-'.repeat(70));

// Benchmark repeated access pattern (likely to have cached lookup).
const repeatedIterations = 100_000;
console.log(`\nRepeated access pattern (${repeatedIterations.toLocaleString()} iterations, 10 reads per callback):`);

checksum = 0;
const t1_repeat = benchmark('  Direct read (repeated)', () => {
  for (let i = 0; i < 10; i++) {
    checksum += directObj.value;
  }
}, repeatedIterations, 10);

checksum = 0;
const t2_repeat = benchmark('  Getter read (repeated)', () => {
  for (let i = 0; i < 10; i++) {
    checksum += getterObj.value;
  }
}, repeatedIterations, 10);

checksum = 0;
const t4_repeat = benchmark('  Immutable read (repeated)', () => {
  for (let i = 0; i < 10; i++) {
    checksum += immutableObj.value;
  }
}, repeatedIterations, 10);

// Multiple object scenario.
console.log('\n' + '='.repeat(70));
console.log('Multi-object scenario (10 objects, 10 reads per callback):');
console.log('-'.repeat(70));

const directObjs = Array.from({ length: 10 }, () => new DirectAccess());
const getterObjs = Array.from({ length: 10 }, () => new GetterAccess());
const immutableObjs = Array.from({ length: 10 }, () => new ImmutableAccess());

checksum = 0;
const t1_multi = benchmark('  Direct read (10 objects)', () => {
  for (const obj of directObjs) {
    checksum += obj.value;
  }
}, iterations / 10, 10);

checksum = 0;
const t2_multi = benchmark('  Getter read (10 objects)', () => {
  for (const obj of getterObjs) {
    checksum += obj.value;
  }
}, iterations / 10, 10);

checksum = 0;
const t4_multi = benchmark('  Immutable read (10 objects)', () => {
  for (const obj of immutableObjs) {
    checksum += obj.value;
  }
}, iterations / 10, 10);

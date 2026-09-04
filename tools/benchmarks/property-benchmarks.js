// Copyright 2025 DXOS.org
//
// Benchmark: Property Access Patterns.

// Setup objects for benchmarking.
const iterations = 1_000_000;

// Pattern 1: Direct property access (read)
class DirectAccess {
  constructor() {
    this.value = 42;
  }
}

// Pattern 2: Getter accessing another object's property (read)
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

// Pattern 3: Simple property assignment (write)
class SimpleWrite {
  constructor() {
    this.value = 0;
  }
}

// Pattern 4: Object.defineProperty with immutable value (read)
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

// Utility function for timing
function benchmark(name, fn, runs = iterations) {
  const start = performance.now();
  for (let i = 0; i < runs; i++) {
    fn();
  }
  const end = performance.now();
  const duration = end - start;
  const opsPerSec = (runs / duration * 1000).toFixed(0);
  console.log(`${name.padEnd(50)} ${duration.toFixed(2)}ms  (${opsPerSec} ops/sec)`);
  return duration;
}

console.log('Property Access Benchmarks');
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

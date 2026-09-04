# DXOS Performance Benchmarks

Performance benchmarks for JavaScript property access patterns and ECHO storage backends.

## Benchmarks

### 1. Property Access Performance

Benchmarks comparing four JavaScript property access patterns in Node.js.

#### Overview

1. **Direct property read** - Simple object property access (`obj.value`)
2. **Getter accessing another object** - Getter method that accesses an inner object's property
3. **Simple property write** - Direct property assignment (`obj.value = x`)
4. **Immutable read** - Using `Object.defineProperty()` with immutable value

#### Running

```bash
# Basic benchmark
node property-benchmarks.js

# Extended benchmark with JIT warmup and multi-object scenarios
node property-benchmarks-extended.js
```

#### Quick Results

- **Direct property read**: Fastest for single access (~2.6ms for 1M ops)
- **Getters/Immutable**: Better performance in repeated access and multi-object scenarios
- **Immutable properties**: Add ~100% overhead but prevent mutations
- **JIT optimization**: V8 significantly optimizes repeated access patterns

See [BENCHMARK_FINDINGS.md](./BENCHMARK_FINDINGS.md) for detailed analysis.

---

### 2. ECHO Storage Performance

Benchmarks comparing ECHO object creation, access, and update performance across three storage backends.

#### Scenarios

- **A) In-Memory** - No database, objects only in memory
- **B) Database** - Objects persisted with Automerge
- **C) Feed Storage** - Objects stored in ordered feed

#### Operations Tested

1. **Obj.make (1 prop)** - Create object with single property
2. **Obj.make (20 props)** - Create object with 20 properties
3. **Property read** - Access property on object
4. **Obj.update (1 prop)** - Update single property
5. **Obj.update (20 props)** - Update 20 properties

#### Running

```bash
npm run benchmark:echo
```

#### Expected Results

- **In-Memory**: Fastest operations, suitable for baseline
- **Database**: Slower due to persistence and automerge merging overhead
- **Feed**: Ordered storage with different performance characteristics

---

## Methodology

### Property Access Benchmarks

- Runtime: Node.js with V8 engine
- Iterations: 1,000,000 per test (extended: 100,000 for repeated access)
- Warmup: 10,000 JIT warmup iterations
- Multiple runs averaged for stability

### ECHO Storage Benchmarks

- Runtime: Node.js with ECHO client/host
- In-Memory: 10,000 object creations, 1M property reads
- Database: 100 objects per test (database overhead)
- Feed: 100 objects per test (ordered storage)
- Includes flush operations for consistency

## Key Insights

### Property Access
1. Single object, single access: Direct read is 2-2.5x faster
2. Repeated access (hot loops): Getters become 44-49% faster due to JIT inlining
3. Multi-object iteration: Getters/Immutable are 37-43% faster
4. Real-world impact: Differences negligible in most applications

### ECHO Storage
1. In-memory operations are baseline reference
2. Database operations include automerge merge overhead
3. Feed storage provides ordered semantics with performance trade-offs
4. Update operations more expensive than creates due to merging

## Running All Benchmarks

```bash
# Run both property and echo benchmarks
npm run benchmark:property
npm run benchmark:echo
```

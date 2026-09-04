# Property Access Performance Benchmarks

Performance benchmarks for different JavaScript property access patterns in Node.js.

## Overview

This directory contains benchmarks comparing four property access patterns:

1. **Direct property read** - Simple object property access (`obj.value`)
2. **Getter accessing another object** - Getter method that accesses an inner object's property
3. **Simple property write** - Direct property assignment (`obj.value = x`)
4. **Immutable read** - Using `Object.defineProperty()` with immutable value

## Running Benchmarks

### Basic Benchmark
Simple comparison of all four patterns:

```bash
node property-benchmarks.js
```

### Extended Benchmark
More comprehensive testing including warmup, repeated access patterns, and multi-object scenarios:

```bash
node property-benchmarks-extended.js
```

## Results Summary

See [BENCHMARK_FINDINGS.md](./BENCHMARK_FINDINGS.md) for detailed analysis and performance recommendations.

### Quick Takeaways

- **Direct property read**: Fastest for single access (~2.6ms for 1M ops)
- **Getters/Immutable**: Better performance in repeated access and multi-object scenarios
- **Immutable properties**: Add ~100% overhead but prevent mutations
- **JIT optimization**: V8 significantly optimizes repeated access patterns

## Methodology

- Runtime: Node.js with V8 engine
- Iterations: 1,000,000 per test (extended has 100,000 for repeated access)
- Warmup: 10,000 JIT warmup iterations
- Measurements: Multiple runs averaged for stability

## Key Insights

1. **Single object, single access**: Direct read is 2-2.5x faster
2. **Repeated access (hot loops)**: Getters become 44-49% faster due to JIT inlining
3. **Multi-object iteration**: Getters/Immutable are 37-43% faster
4. **Real-world impact**: Performance differences negligible in most applications

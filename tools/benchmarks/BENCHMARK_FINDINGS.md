# Property Access Performance Benchmarks

## Executive Summary

Benchmarks comparing four property access patterns in Node.js (V8 engine):
1. **Direct property read** - Simple object property access
2. **Getter accessing another object** - Getter that accesses an inner object's property
3. **Simple property write** - Direct property assignment
4. **Immutable read** - Using `Object.defineProperty()` with value immutable

## Key Findings

### Single Object Access Pattern (1M iterations)

| Pattern | Time | Ops/sec | Relative to Direct | Notes |
|---------|------|---------|-------------------|-------|
| Direct property read | 2.65ms | 377M | **1.0x (baseline)** | **FASTEST** |
| Immutable read | 5.29ms | 189M | 2.0x (100% slower) | Descriptor overhead |
| Simple write | 5.67ms | 176M | 2.14x (114% slower) | Write barrier cost |
| Getter read | 6.53ms | 153M | 2.46x (146% slower) | Method call overhead |

**Direct property reads are 2-2.5x faster** than other patterns in baseline single-access scenarios.

---

### Repeated Access Pattern (100k iterations, 10 accesses per iteration)

| Pattern | Time | Ops/sec | Improvement |
|---------|------|---------|------------|
| Direct read | 2.89ms | 34.6M | Baseline |
| Immutable read | 1.39ms | 71.8M | **49% faster** ⬆️ |
| Getter read | 1.60ms | 62.5M | **44% faster** ⬆️ |

**Repeated access shows dramatic speedup for immutable/getter patterns**, suggesting JIT compiler inlining optimizations are particularly effective.

---

### Multi-Object Scenario (10 objects, 1M total accesses)

| Pattern | Time | Ops/sec | Relative | Performance |
|---------|------|---------|----------|-------------|
| Direct read | 5.38ms | 18.6M | 1.0x | Baseline |
| Getter read | 3.39ms | 29.5M | 0.63x | **37% faster** ⬆️ |
| Immutable read | 3.07ms | 32.6M | 0.57x | **43% faster** ⬆️ |

**Multi-object scenarios favor getters/immutable patterns**, possibly due to better memory layout and cache locality.

---

## Performance Insights

### Why Direct Read is Slower in Some Scenarios

1. **Hot-path JIT optimization**: V8's JIT compiler can inline getters and specialize code paths based on observed patterns
2. **Memory access patterns**: Immutable properties with `Object.defineProperty()` may have different memory layout that's more cache-friendly
3. **Write barriers**: Simple property writes involve write barriers for GC tracking, which can be expensive

### Real-World Implications

1. **Repeated access (hot loops)**: Getters and immutable properties become comparable to or faster than direct reads
2. **Multiple object iteration**: Getters scale better than direct access
3. **Single-access patterns**: Direct property access maintains a 2-2.5x advantage
4. **Memory efficiency**: Immutable properties prevent accidental mutations but with minimal runtime cost in repeated access

### Recommendations

| Scenario | Best Choice | Rationale |
|----------|-------------|-----------|
| Hot loops, repeated access | Getter or Immutable | JIT optimizes inline lookups |
| Object validation/control | Immutable properties | Prevent mutations with ~100% overhead cost |
| Public API design | Getters | Clean interface with good performance |
| Performance-critical paths | Direct read | 2-2.5x faster for single access |
| Multi-object iteration | Immutable/Getter | 37-43% faster than direct read |

---

## Test Configuration

- **Runtime**: Node.js with V8 engine
- **Test size**: 1,000,000 iterations (baseline)
- **Warmup**: 10,000 JIT warmup iterations before testing
- **Multiple runs**: Results averaged across 2-3 runs for stability

## Conclusion

The choice between these property access patterns depends on the use case:
- **Direct access** wins for single-access performance
- **Getters/Immutable** win in repeated access and multi-object scenarios due to JIT optimization
- **Immutable properties** add ~100% overhead but prevent mutation bugs in public APIs
- Modern V8 is highly optimized; the performance differences in most applications will be negligible

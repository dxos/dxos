---
name: effect
description: Guides working with Effect-TS in TypeScript codebases. Use when writing Effect programs, defining services/layers, handling errors, running effects, or when code uses effect, Context, Layer, Effect.gen, or related Effect patterns.
---

# Working with Effect

Effect is a TypeScript library for building complex synchronous and asynchronous programs with typed errors, dependency injection, and resource management. Reference: <https://effect.website/llms.txt>.

## Core Principles (Inlined)

### The Effect Type

`Effect<Success, Error, Requirements>` is a lazy, immutable description of a workflow:

- **Success**: Value on success.
- **Error**: Expected (typed) errors; use `never` when effect cannot fail.
- **Requirements**: Services/dependencies from `Context`; use `never` when none needed.

Effects are *descriptions*, not executions. They run via the Effect runtime at a single entry point.

```ts
import { Effect, Context, Layer } from 'effect';

// Effect<number, never, never> - succeeds with number, no errors, no deps
const pure = Effect.succeed(42);

// Effect<never, Error, never> - fails with Error
const failure = Effect.fail(new Error('failed'));
```

### Two Types of Errors

| Type          | Tracked in type | Purpose                                            |
|---------------|-----------------|----------------------------------------------------|
| **Expected**  | Yes (`Error` in Effect) | Anticipated, domain errors, recoverable (like checked exceptions) |
| **Unexpected**| No              | Defects, bugs, unanticipated (like unchecked exceptions) |

Use `Effect.fail()` for expected errors. Thrown errors in sync/async code become defects. Avoid `throw`; prefer `Effect.fail` or `Effect.try`.

### Creating Effects

| Constructor        | Use case                                      |
|--------------------|-----------------------------------------------|
| `Effect.succeed(v)`| Pure success                                  |
| `Effect.fail(e)`   | Expected failure                              |
| `Effect.sync(() => x)` | Sync side effect; must not throw           |
| `Effect.try(() => x)`  | Sync that may throw → defect or caught     |
| `Effect.promise(() => Promise)` | Wrap Promise (reject → defect)   |
| `Effect.gen(function* () { ... })` | Generator style, like async/await |

```ts
const program = Effect.gen(function* () {
  const a = yield* Effect.succeed(1);
  const b = yield* Effect.succeed(2);
  return a + b;
});
```

### Running Effects

| Function              | Returns   | When to use                         |
|-----------------------|-----------|-------------------------------------|
| `Effect.runSync(e)`   | `A`       | Sync only, no fail; throws otherwise |
| `Effect.runPromise(e)`| `Promise<A>` | Async; rejects on failure         |
| `Effect.runPromiseExit(e)` | `Promise<Exit<A, E>>` | Get Exit for custom handling |

Provide requirements before running: `Effect.runPromise(Effect.provide(program, layer))`.

### Services and Context

1. **Define a service** with `Context.Tag`:

```ts
class MyService extends Context.Tag('MyService')<
  MyService,
  { readonly doSomething: () => Effect.Effect<string, never> }
>() {}
```

2. **Use in effects** – the service appears in `Requirements`:

```ts
const program = Effect.gen(function* () {
  const service = yield* MyService;
  return yield* service.doSomething();
});
// Effect<string, never, MyService>
```

3. **Provide** with `Effect.provideService` or `Effect.provide` + `Layer`.

### Layers

Layers construct services and hide implementation dependencies. Avoid leaking internal deps in service interfaces.

- `Layer.succeed(Tag, implementation)` – static implementation
- `Layer.effect(Tag, Effect)` – effectful construction
- `Layer.merge(a, b)` – combine layers
- Compose with `Layer.provide` / `Layer.provideMerge` for dependency graphs

Provide at the edge: `Effect.provide(program, AppLive)`.

### Common Patterns

- **Do notation**: Prefer `Effect.gen` over manual `flatMap` chains.
- **Error recovery**: `Effect.catchAll`, `Effect.catchTag`, `Effect.orElse`, `Effect.retry`.
- **Resource management**: `Effect.scoped`, `Scope`, `acquireRelease`.
- **Concurrency**: `Effect.all` (parallel), `Effect.forEach` with concurrency.
- **Tagged errors**: Use `Data.TaggedClass` or `Data.TaggedEnum` for typed domain errors.

## Quick Reference

**Import:**
```ts
import { Effect, Context, Layer, Data } from 'effect';
```

**Run program with layer:**
```ts
const runnable = Effect.provide(program, AppLive);
Effect.runPromise(runnable);
```

**Typed error:**
```ts
class HttpError extends Data.TaggedClass('HttpError')<{ readonly status: number }> {}
```

## Documentation Index

For deeper topics, see <https://effect.website/docs/>:

- **Getting started**: Creating Effects, Running Effects, The Effect Type, Using Generators
- **Error management**: Two Error Types, Expected Errors, Fallback, Retrying
- **Services**: Managing Services, Managing Layers, Default Services
- **Concurrency**: Basic Concurrency, Fibers, Queue, Semaphore
- **Schema**: effect/Schema for validation and encoding
- **API**: <https://effect.website/docs/additional-resources/api-reference/>

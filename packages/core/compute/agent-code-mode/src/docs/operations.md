# Operations

The skills describe their capabilities as tools; in code mode they are NOT tools. Resolve the
operation by the DXN the system prompt lists for it, then invoke it the way any DXOS code does:

```js
const Score = yield* Database.resolve('dxn:com.example.operation.score');
const score = yield* Operation.invoke(Score, { title: 'Write the docs' });
```

Resolve each operation once and reuse it inside a loop.

## Input

The `input` listed for each operation is the operation's own schema. Where it takes an object or a
`Ref<typename>`, pass the object you hold (or `Ref.make(obj)`) — never an id or a URI string; fetch
the object first if all you hold is its id.

A skill that spells a reference as a `{"/": "echo:..."}` envelope or a URI string is describing the
tool form. In code, the system prompt's input wins.

## Failures

A failed operation fails the whole program, and it fails as a defect, which `Effect.result` does
not catch. Wrap a call you expect might fail in `Effect.exit` instead:

```js
const exit = yield* Effect.exit(Operation.invoke(Score, { title: 'Write the docs' }));
if (exit._tag === 'Failure') {
  yield* print('failed', String(exit.cause));
} else {
  yield* print('score', exit.value);
}
```

## When not to use one

Most of what an operation does to a single object is a line of `Obj` / `Database` code. Prefer that.

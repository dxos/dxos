# Errors

## Effect.result

`Effect.result` turns a failure into a value, so one failing step does not end the program:

```js
const result = yield * Effect.result(Database.load(ref));
if (result._tag === 'Success') {
  yield * print(result.success.title);
} else {
  yield * print('failed', String(result.failure));
}
```

The value is `{ _tag: 'Success', success }` or `{ _tag: 'Failure', failure }`. There is no `value`
field.

## Mistakes that cost a call

- Calling a helper these docs do not show: it fails as `is not a function`. Read the docs instead.
- Using `import` or `require`: the modules are already in scope.
- Writing the `Effect.gen` wrapper yourself: your code already is its body.
- Assigning a property of a stored object outside `Obj.update`.
- Passing an id or URI string where a `Ref<typename>` is expected.
- Resolving a DXN the system prompt does not list.

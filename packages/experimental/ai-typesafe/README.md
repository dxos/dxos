# @dxos/ai-typesafe

Experimental: a model catalog whose capabilities live in the type system.

A model is declared with `defineModel`, which preserves its id and capability list as literal types.
Everything downstream is then checked by the type-checker rather than by the provider at runtime:

- `createRequest(model, prompt, options)` accepts `thinking` only for a model that declares
  `thinking`, and `tools` only for one that declares `tools`.
- `requireCapabilities(model, [...])` narrows to a model declaring those capabilities, and throws if
  the declaration and the catalog ever disagree.
- `defineCatalog([...])` indexes by id: `catalog.get(id)` returns the specific model type (so its
  capabilities survive the lookup), and rejects an unknown id at compile time.

```ts
const opus = defineModel({
  id: 'com.anthropic.model.claude-opus-5',
  label: 'Claude Opus 5',
  contextWindow: 200_000,
  capabilities: ['tools', 'thinking'],
});

createRequest(opus, 'hello', { thinking: true }); // ok
```

See `src/model.test.ts` for the behaviour, including the `@ts-expect-error` cases that pin the
compile-time failures.

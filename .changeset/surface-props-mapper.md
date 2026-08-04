---
'@dxos/app-framework': minor
---

`Surface.create` accepts an optional `props` mapper, so a container can be registered directly
instead of being wrapped in an adapter that unpacks the surface's `data` envelope:

```ts
Surface.create({
  id: 'defaultPluginSettings',
  filter: AppSurface.settings(AppSurface.Article),
  component: DefaultSettings,
  props: ({ data: { subject } }) => ({ subject }),
});
```

The mapper's input type derives from the same `filter` that defines the surface's data shape, so the
unpacking is type-checked rather than restated by hand. Additive: definitions without `props` receive
the full surface props exactly as before.

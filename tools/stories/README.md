# DXOS Storybook

Storybook config package for the DXOS monorepo.

## Testing

To run the storybook:

```bash
pnpm -w nx storybook stories
```

To run vitest against the stories run the following (with the storybook dev server running):

```bash
pnpm test-storybook --url http://127.0.0.1:9009 -- --watch
```

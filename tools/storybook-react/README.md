# @dxos/storybook-react

Storybook config package for the DXOS monorepo.

## Testing

To run the storybook:

```bash
pnpm storybook dev -p 9009 --no-open
```

```bash
moon run storybook-react:serve
```

### Fast dev mode

For long sessions that would otherwise slow down and wedge the browser tab, run
the fast variant:

```bash
moon run storybook-react:serve-fast
```

This sets `DX_FASTBUNDLE=1` in `.storybook/main.ts`, which skips the
`importSource` source-resolution plugin and pre-bundles heavy deps (react,
effect, codemirror, radix, automerge, atlaskit), shrinking the live module graph.
The tradeoff is less granular HMR on `@dxos/*` source — best when iterating on a
single package's stories rather than editing deep DXOS internals. Note that WASM
stories (`@dxos/wa-sqlite`, `manifold-3d`) don't free memory on unmount and
StrictMode double-mounts effects, so hard-reload the tab periodically either way.

To run vitest against the stories run the following (with the storybook dev server running):

```bash
pnpm test-storybook --url http://127.0.0.1:9009 -- --watch
```

## Hang watcher

`serve.sh` runs `diagnose.sh --ensure`, which starts ONE watcher per machine
(`~/.cache/dxos/watch/`). It polls every known dev-server port (`.claude/launch.json`
plus 9009/5199) every 15s, rewrites `status`, and captures a wedged server to
`<its worktree>/temp/`. `diagnose.sh --status` prints the table; `--restart`
replaces a running watcher with this checkout's script. Tests:
`bash tools/storybook-react/scripts/diagnose.test.sh`.

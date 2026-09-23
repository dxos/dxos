# Open a pull request in Composer from the browser extension

How to exercise `org.dxos.operation.github.importPullRequestFromSnapshot` end to end. The fixture is
[dxos/dxos#1](https://github.com/dxos/dxos/pull/1) — public, closed and two files, so it never
changes and the import takes the anonymous path with no GitHub connection to set up.

Two routes, both driving the same operation. The spec they execute is `test QA-3` in
[`../PLUGIN.mdl`](../PLUGIN.mdl).

## Route 1 — the QA runner (what to use for a pass/fail report)

Follow the `composer-qa` skill; it starts the dev server, drives each `invoke` through the agent
debug port and judges the result from the UI snapshot.

```bash
moon run composer-app:serve          # http://localhost:5173
# then, per the skill: /dxos:qa plugin-github QA-3
```

This covers everything below the extension: the descriptor's operation, the URL-only import, the
idempotent second invoke, and the cleanup. It does **not** exercise the extension's own hops
(content script relay, registry refresh, ack correlation) — nothing invoked through the debug port
does.

## Route 2 — the real extension (what to use for a video)

Only this route proves the wire. Follow the `recording-demos` skill to capture it.

1. Build and load the extension:
   ```bash
   moon run composer-crx:bundle
   ```
   `chrome://extensions` → Developer mode → **Load unpacked** → the package's `dist` directory.
2. Open Composer at one of the extension's default hosts — `http://localhost:5173`,
   `https://preview.composer.space` or `https://composer.space`. Anything else needs its match
   pattern adding on the extension's options page first, or `findComposerTab` will not see it.
3. Sign in, open a space, and make it the active one. The operation writes to the active space's
   database; with none open the extension acks `noSpace`.
4. In Composer's settings, confirm the extension's `enabled` toggle is on, and turn on
   **auto-open after clip** — that is what makes the imported pull request open in the deck rather
   than only toast.
5. Navigate a second tab to `https://github.com/dxos/dxos/pull/1`.
6. Click the Composer toolbar icon to open the side panel. **Open PR in Composer** appears in the
   page-actions row (it is contributed for the `popup` and `picker` contexts, matching
   `https://github.com/*/*/pull/*`).
7. Click it. Expected: a success toast in the Composer tab, and the pull request opens as an
   article titled `chore: release 1.0.0`, with its state and CI outcome and a **Generate
   walkthrough** action.
8. Click it again on the same page. Expected: the same object, not a second copy — the import is
   idempotent by owner/repo/number.
9. Click **Generate walkthrough** in the article toolbar. Expected: the change narrated as one
   markdown document with its diff chunks spliced in. This is the only step needing an AI provider
   configured; GitHub is still read anonymously.
10. Clean up: delete the pull request object from the space.

### When the action does not appear

- **Empty page-actions row** — the extension's registry is a cache. It refreshes when the Composer
  page announces itself; reload the Composer tab, then reopen the side panel.
- **Row populated but no PR action** — the plugin's `PageActionProvider` module activates on
  `CrxEvents.Start`, which the host trickles in on idle. Give the Composer tab a moment after boot.
- **Blank icon** — the sprite is built by scanning `packages/plugins/*/src/capabilities/page-action*.ts`
  (`composer-crx/vite.config.ts`), so an icon declared anywhere else does not ship.
- **`noSpace` / `disabled` toast** — steps 3 and 4.

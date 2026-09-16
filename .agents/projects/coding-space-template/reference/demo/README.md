# The walkthrough recorder

`record-walkthrough.mjs` drives Composer through the template's first stretch — boot, create the
space from the "Chess MCP on Workers" template, then open the plan, the brief and the seeded
position — and records it as a `.webm`. It exists because the recording could not be produced in the
cloud sandbox that wrote the template, for a reason that is about the sandbox and not the script.

## Running it

A Composer dev server must be up with `DX_DEV=true` (the template is contributed by
`plugin-debug`, which is enabled only under `isDev`; a plain `serve` shows no templates at all):

```bash
DX_DEV=true moon run composer-app:serve          # port 5173
SHOTS=./shots VIDEO=./video LOGFILE=./record.log node record-walkthrough.mjs
```

Run it from the repo root so `@playwright/test` resolves.

## Why it does not finish in the cloud sandbox

Composer's shared worker has a **fixed 15-second deadline** to open its leader session
(`worker-framework/src/internal/locks.ts`). On the 4-core sandbox, ffmpeg's capture takes ~60% of a
core, and the browser then misses that deadline:

```
WorkerConnectionError: Worker connection timed out after 15000ms: opening worker leader session
client services failed to open → fatal dialog
```

With no capture running, the identical walkthrough boots in 24 seconds and completes — which is how
the screenshots in the project's TASKS.md were taken. So the recording is not blocked by the app or
by the template; it is blocked by recording competing with the app for the same four cores. More
cores, or a capture path that does not compete with the browser, is all it needs.

Two unrelated traps cost several attempts and are worth knowing:

- **Kill a run and you orphan its chromium.** Twenty-two of them starved the box to load 9 before
  this was noticed. Reap by the path `/opt/pw-browsers/chromium`, and close the context in a
  `finally`.
- **A long-running dev server can serve a stale vite pre-bundle.** After a `main` merge that adds an
  export, the browser gets "does not provide an export named …" from a `dist` that is actually
  correct on disk. Clear `node_modules/.vite` and restart, rather than rebuilding the package.

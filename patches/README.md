# Patches

Fixes to dependencies we do not own, applied by pnpm's `patchedDependencies` (see
[`pnpm-workspace.yaml`](../pnpm-workspace.yaml)). Each is meant to be dropped once the upstream
release carries the fix; the notes below say how to tell.

## `@zag-js/presence@1.43.3`

**What.** Unmounts a closed element when it has no unfinished animation, alongside zag's existing
"no animation to wait for" conditions.

**Why.** Zag decides in a `requestAnimationFrame` callback whether to wait for `animationend`.
WebKit starts an animation's clock at style resolution rather than at the next frame, so after a
long task a frame can dispatch `animationend` before those callbacks run. Zag then waits for an
event that already fired and the element never unmounts — a dialog stays on screen for good. It
does not reproduce in Chromium, which starts the clock at the frame.

**Retesting after a zag upgrade.** `TestCloseDuringLongTask` in
[`Dialog.stories.tsx`](../packages/ui/react-ui/src/components/Dialog/Dialog.stories.tsx) is the
regression: it closes a dialog behind a 600ms busy loop and expects it to unmount. Drop this patch's
line from `pnpm-workspace.yaml`, reinstall, and run the story where the bug lives:

```bash
DX_STORYBOOK_BROWSER=webkit pnpm --dir packages/ui/react-ui exec vitest run --project=storybook src/components/Dialog
```

Measured on 1.43.3: it fails without the patch and passes with it, in WebKit only. A pass without the
patch means the upgrade carries the fix, and the patch and this section can go.

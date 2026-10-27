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

## `@zag-js/combobox@1.43.3`

**What.** `syncInputValue` skips writing a value the user typed earlier once the field already holds a
later keystroke.

**Why.** Zag handles each event in a microtask, so the state a keystroke sets renders at default
priority, and the effect that copies that state into the field can run after the next keystroke has
already landed. It then writes the older value back and the newer key is gone: on a slow device,
typing "Offline mode" into a picker could leave "Offlie mode". The patch records the values each
`INPUT.CHANGE` reported and skips only a write of one of those that is older than what the field
shows, so an `inputValue` the caller sets (a cleared or transformed query) is still written.
Unchanged in zag 1.46.0.

**Retesting after a zag upgrade.** `CreateFeature` in
[`ProjectFeatures.stories.tsx`](../packages/plugins/plugin-projects/src/containers/ProjectFeatures/ProjectFeatures.stories.tsx)
types a feature name into a picker and needs the race to lose; it takes a slow CPU to hit it. Drop
this patch's line from `pnpm-workspace.yaml`, reinstall, and run it repeatedly:

```bash
for i in $(seq 8); do DX_STORYBOOK_CPU_THROTTLE=4 pnpm --dir packages/plugins/plugin-projects exec vitest run --project=storybook src/containers/ProjectFeatures -t 'Create Feature'; done
```

Measured on 1.43.3: three of eight runs fail without the patch, twelve of twelve pass with it. If the
upgrade's `syncInputValue` checks for `INPUT.CHANGE` before writing, the patch and this section can go.

## `memory-pager@1.5.0`

**What.** Starts each level of the pager's radix tree as an empty array that grows as pages are set,
instead of preallocating all 32,768 slots.

**Why.** hypercore 9 (vendored in `@dxos/vendor-hypercore`) builds four pagers per feed for its
bitfields, and each preallocated level cost 128 KB in V8 (256 KB in JSC) however few pages the feed
held. On a profile with ~120 feeds that was 62 MB of the ECHO worker's heap in Chromium, and about
twice that in the WebKit the desktop app runs. Lookups and `toBuffer` are unchanged: a slot never
set reads `undefined` either way.

**Retesting after an upgrade.** memory-pager has not had a release since 1.5.0. If one appears, check
its constructor: a `new Array(32768)` there means the patch is still needed.

## `dfx@1.0.15`

**What.** Rewrites dfx's `effect/unstable/*` imports to the top-level paths Effect 4.0.0 moved them to
(`effect/unstable/http/HttpClient` becomes `effect/http/HttpClient`, and likewise for `persistence`
and `socket`).

**Why.** Effect 4.0.0 removed the `unstable/` prefix. dfx still imports through it as of 1.0.16, so
without the patch `plugin-discord` fails to typecheck and its layers fail to load at runtime.

**Retesting after a dfx upgrade.** If the new release's `dist` has no `effect/unstable/` imports, drop
this patch's line from `pnpm-workspace.yaml`, reinstall, and run `moon run plugin-discord:build`. A
clean build means the patch and this section can go.

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

## `dfx@1.0.15`

**What.** Rewrites dfx's `effect/unstable/*` imports to the top-level paths Effect 4.0.0 moved them to
(`effect/unstable/http/HttpClient` becomes `effect/http/HttpClient`, and likewise for `persistence`
and `socket`).

**Why.** Effect 4.0.0 removed the `unstable/` prefix. dfx still imports through it as of 1.0.16, so
without the patch `plugin-discord` fails to typecheck and its layers fail to load at runtime.

**Retesting after a dfx upgrade.** If the new release's `dist` has no `effect/unstable/` imports, drop
this patch's line from `pnpm-workspace.yaml`, reinstall, and run `moon run plugin-discord:build`. A
clean build means the patch and this section can go.

## `effect@4.0.0`

**What.** Lets a decision carry images: `DecisionModel.decide(definition, { input, images })` passes
them to the provider as `ProviderOptions.images`, and `DecisionModel.make({ supportsImages })` says
whether the provider can read them. A model made without it fails a call that passes images with
`AiError.InvalidUserInputError`, so a text-only model never answers about a picture it did not see.

**Why.** Cloudflare's Clef decision models read up to four images beside the state, which is how the
illustrator's judges see a diagram as drawn instead of an ASCII rendering of it. Effect's
`DecisionModel` hands a provider only the encoded state, so there was no way to send one.

**Retesting after an effect upgrade.** If the new release's `effect/ai/DecisionModel` exports `Image`
and `DecideOptions` has `images`, drop this patch's line from `pnpm-workspace.yaml`, reinstall, and
run `moon run ai:test -- src/resolvers/typesafe/TypeSafeResolver.test.ts`. A pass means the patch and
this section can go.

---
'@dxos/react-ui': minor
---

Put controls on a single three-step scale — 24 / 32 / 40px (`sm` / `md` / `lg`) — replacing 17
distinct heights. Breaking: the `xs` density is removed (`Density` is now `'lg' | 'md' | 'sm'`) and
anything previously `sm` (28px) renders at 24px.

`DensityProvider` supplies density through React context only and renders no DOM; controls read it
and emit `data-density`, which overrides `--dx-control` for that element alone. It deliberately does
not emit a `dx-density-*` class — that set the knob for an entire subtree, so a provider intended for
one region silently resized unrelated descendants. A region that wants subtree-wide density applies
the class itself at the call site, as `Toolbar.Root` does.

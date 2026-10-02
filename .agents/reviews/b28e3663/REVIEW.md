---
branch: dm/optimistic-curie-axs83b
commit: b28e366359ac798723ac0072e6481e0e54e7d0ad
base: HEAD~1
mode: pr-only
createdAt: 2026-09-29T13:41:15.788Z
isFinalized: true
groups: 54
rules: [design-tokens-not-raw-spacing-sizing, no-invented-theme-tokens]
reviewId: b28e3663
---

_0 error(s), 2 warning(s)._

# WARN b28e3663-1 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:248`

The collapsed prompt uses a raw bracketed arbitrary value (`mask-b-from-[calc(100%-4rem)]`) for the fade-out mask, bypassing the design system's sizing tokens (`design-tokens-not-raw-spacing-sizing`). Use a semantic token or theme-defined mask/size utility if one exists, or state in a comment why none expresses this fade.

# WARN b28e3663-2 no-invented-theme-tokens `packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:257`

`hover:text-base-text` is an invented token: the theme declares `--color-base-fg`, not `--color-base-text`, so the hover class generates no CSS. Use `hover:text-base-fg` (rule: no-invented-theme-tokens).

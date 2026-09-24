---
'@dxos/react-ui': minor
---

`Carousel` no longer auto-advances for a reader who has set `prefers-reduced-motion`, or under the
new `VITE_DX_DISABLE_ANIMATIONS=true`, which turns off animation that runs without a user gesture.
An unattended carousel — the tour's welcome panel advances every 10s — had been making every frame
of an agent-driven recording differ from the last, defeating the still-frame culling those
recordings depend on. The `useReducedMotion` hook behind it is now exported from the package.

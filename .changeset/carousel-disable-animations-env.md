---
'@dxos/react-ui': minor
---

`VITE_DX_DISABLE_ANIMATIONS=true` turns off animation that runs without a user gesture. `Carousel`
drops its `autoAdvance` autoplay under the flag, so an unattended carousel — the tour's welcome
panel advances every 10s — no longer makes every frame of an agent-driven recording differ from the
last, which had been defeating the still-frame culling those recordings depend on.

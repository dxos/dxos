---
'@dxos/app-toolkit': minor
'@dxos/plugin-github': minor
---

Add an `AppSurface.CardMenu` role and `CardMenuSlot`, so plugins can contribute items to a card header's menu. A pull request card's menu now offers "Open walkthrough", or "Generate walkthrough" when there is none yet. The walkthrough article shows the pull request's number, state and CI status, and can approve the pull request, post a comment, comment on a single diff line (`diffBlocks({ onLineComment })`) or copy its link. `AnchorWidget` accepts a leading icon, which pull request link chips use.

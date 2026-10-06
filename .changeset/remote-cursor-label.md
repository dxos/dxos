---
'@dxos/ui-editor': patch
---

- **Remote cursor name:** a collaborator's name shows as a tooltip on hovering their caret, drawn outside the editor's scroller so it is never clipped; it sits above the caret like a flag, stays up for at least a second, hides when the peer moves, and hides the caret's dot while shown. The caret keeps the name as visually hidden text for assistive tech.
- **Banner:** a neutral (default) banner is transparent and bordered, with the host's text colour and a muted body; valence banners keep their own surfaces. The chat's plugin prompt is now a Banner.
- **Devices settings:** the logout section is headed "Danger Zone", with the full warning on the Log out field.

---
'@dxos/plugin-presenter': patch
---

Pressing Escape in the presenter companion no longer blanks the slides; Escape only exits fullscreen presentations. Fullscreen slides stay centered in windows wider than 16:9 in WebKit (the native app), where they previously overflowed the bottom of the screen.

---
'@dxos/echo': patch
---

Live `childOf` and `.children()` queries ignore writes outside their parents' subtree instead of rescanning every loaded object, so a tab with many such queries open no longer slows down as more objects load.

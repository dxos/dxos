---
'@dxos/plugin-deck': minor
---

Moving between two articles in a solo deck crossfades instead of cutting: the plank being left is held over the one being entered until that has rendered, then faded out. It reuses `transitionWhenRendered`, the live-element fade workspace switches already use, rather than a view transition — objects were taken off the view-transition path on purpose, for WebKit.

Solo only. A sliding deck lays its planks side by side, so a held plank would appear beside the new one rather than over it, and the deck's presentation is derived from how many planks render, so holding one there would flip it out of fullbleed mid-fade. The held plank is a second live article for the length of the fade, which is why it is bounded and skipped whenever motion is reduced.

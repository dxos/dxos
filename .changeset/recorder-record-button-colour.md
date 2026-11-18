---
'@dxos/plugin-recorder': patch
---

The presenter toolbar's record button is red while it is recording, and on the warning a failed attempt leaves. It carried `text-error-text` unconditionally, so it sat red in the toolbar whatever the recorder was doing, which reads as a running recording.

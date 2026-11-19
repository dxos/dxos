---
'@dxos/assistant': patch
---

Agent turns now state today's date (UTC) at the end of the system prompt, so the model no longer resolves a date given without a year, such as a milestone on "12 December", to a past year.

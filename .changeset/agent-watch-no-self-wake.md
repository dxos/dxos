---
'@dxos/plugin-agent': patch
---

An agent watch no longer notifies its recipient about something they said themselves, refuses a watch that would only ever do so, and sends nothing for a watch cancelled while its update was being written.

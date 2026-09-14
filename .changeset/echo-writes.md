---
'@dxos/echo-client': patch
---

Fix writes that hung or were lost: a refused document creation no longer stalls later flushes, failed feed appends back off instead of spinning or re-sending committed chunks, and objects created just before `Client.destroy()` reach the host.

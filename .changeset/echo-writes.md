---
'@dxos/echo-client': patch
---

Fix writes that hung or were lost: `flush()` throws when a document creation or feed append cannot reach the host, a failed document creation is retried rather than dropping its object, failed feed appends back off instead of spinning or re-sending committed chunks, and objects created just before `Client.destroy()` reach the host.

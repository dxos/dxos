---
'@dxos/echo-client': patch
---

Assigning a nested record read off a detached (never-added) object into a database-backed object now copies it by value, as it already did for records read off database-backed objects. Previously it threw `Object references must be wrapped with \`Ref.make\``, because the copy-on-assign path only recognized proxies from the database handler; callers had to spread by hand.

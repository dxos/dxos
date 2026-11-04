---
'@dxos/echo-client': patch
---

`db.add` accepts an object whose static type the database's registry lacks when the hypergraph has a type source registered, and registers that type. A plugin bundle on EDGE can now write an object of a type another plugin contributes, such as plugin-agent adding plugin-assistant's `Instructions`. Without a type source, an unregistered type still fails with `Schema not registered`.

---
'@dxos/deus': minor
'@dxos/plugin-code': patch
---

Add the worker dialect (`lang/worker.mdl`): `binding`, `actor`, `route` and `keyspace` blocks describe a worker's environment bindings and their types, its Durable Objects, its HTTP routes and its key-value state. `deus lint` accepts them, and the spec viewer gives each its own icon and colour.

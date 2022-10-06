# Class `Selection`
> Declared in package `@dxos/echo-db`

Selections are used to construct database subscriptions.
They are [monads](https://www.quora.com/What-are-monads-in-computer-science) that support
the functional composition of predicates to traverse the graph.
Additionally, selections may be used to create reducers that compute an aggregated value over the traversal.

Implementation:
Each Selection contains a visitor

## Members
- @dxos/echo-db.Selection.T
- @dxos/echo-db.Selection.R
- @dxos/echo-db.Selection.constructor
- @dxos/echo-db.Selection.root
- @dxos/echo-db.Selection._createSubSelection
- @dxos/echo-db.Selection.call
- @dxos/echo-db.Selection.children
- @dxos/echo-db.Selection.exec
- @dxos/echo-db.Selection.filter
- @dxos/echo-db.Selection.links
- @dxos/echo-db.Selection.parent
- @dxos/echo-db.Selection.query
- @dxos/echo-db.Selection.refs
- @dxos/echo-db.Selection.source
- @dxos/echo-db.Selection.target

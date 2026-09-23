---
'@dxos/echo': patch
---

Typed objects share one Effect schema per property type instead of building a new one for every nested object. The typed handler stamps a property's schema on each nested record it wraps, and `SchemaValidator` built that schema with `Schema.make` on every call; it now memoizes the result per AST node. In Composer's perf flow this cut the page's schema instances from about 38,800 to 9,400 and the page JS heap by about 11 MB.

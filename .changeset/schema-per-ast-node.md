---
'@dxos/echo': patch
---

A typed object's nested records and arrays carry the schema AST they follow instead of a schema of their own. The typed handler stamped a fresh `Schema.make` wrapper on every nested value it wrapped, each with its own closures, and kept it for the value's lifetime; it now stamps the AST, and a schema is built only when one is needed, such as to validate a write or for `getSchema` on a nested value. `SchemaValidator.assertExactProperties` takes an AST. In Composer's perf flow this cut the page's schema wrappers from about 38,800 to 9,200 and the page JS heap by 6 to 10 MB.

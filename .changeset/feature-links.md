---
'@dxos/keys': minor
'@dxos/plugin-projects': minor
---

A DXN can end in an ECHO object mnemonic, `dxn:<nsid>[:<version>][#<mnemonic>]`, read and set with `DXN.getMnemonic`, `DXN.withMnemonic` and `DXN.withoutMnemonic`; `DXN.make` never adds one. Features take a `meta.key` and are cited from code as `dxn:<meta.key>#<mnemonic>` in a `@feature` JSDoc tag: the `scan-feature-links` script collects the tags, the `importFeatureLinks` operation stores them on each feature, and the feature map shows each feature's DXN and the tests and code that cite it.

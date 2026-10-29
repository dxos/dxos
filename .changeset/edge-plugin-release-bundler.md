---
'@dxos/edge-compute': minor
---

`@dxos/edge-compute/native` exports `bundleModule`, the Workers bundler behind `bundleFunction`, so other main modules (such as an EDGE plugin release) can be bundled the same way; every bundle result now lists the `externals` its modules import without containing.

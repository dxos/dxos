---
'@dxos/plugin-google': minor
---

`@dxos/plugin-google` and `@dxos/plugin-jmap` now publish to npm. Both were held back as private while the mail providers were extracted out of `@dxos/plugin-inbox`; they are stable enough to consume directly, and EDGE needs to resolve their operation handler sets to run mail sync remotely.

Both also declared `effect` and `@effect/platform` in `dependencies` as well as `peerDependencies`. Those claims contradict each other — a peer says the consumer supplies the package, a dependency says the plugin brings its own — and the pairing risks a consumer resolving two copies of the Effect runtime. They are now devDependencies alongside the peer range, matching `@dxos/plugin-inbox`.

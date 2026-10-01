---
'@dxos/app-framework': patch
---

A plugin enabled after boot now gets its services without a reload. The process manager used to
build its service stack from the `LayerSpec`s present at boot and only log the ones contributed
later, so enabling a plugin such as Sandbox at runtime left its tools failing with
`ServiceNotAvailable`. `LayerStack.addLayers` now adds specs to a live stack: built slices are
extended in place, so services already running are neither rebuilt nor released, and a spec that
was pruned for a dependency nobody provided yet is re-admitted once a later spec provides it. A spec
that would close a requires/provides cycle is rejected with an error and the rest are still added.
Disabling a plugin does not remove its services until the next boot.

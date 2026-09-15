---
'@dxos/observability': patch
---

Stamp the build's commit hash on exported telemetry as `vcs.ref.head.revision`, so two deploys of one `service.version` can be told apart.

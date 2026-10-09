---
'@dxos/compute-runtime': patch
---

An operation invoked with `on: 'edge'` now fails with EDGE's reason when EDGE refuses its process (for example `Unknown process key`), and with `RemoteRuntimeUnreachableError` when EDGE has not accepted it within 30 seconds, instead of waiting forever; the agent's Brain store view shows that error rather than "Reading the brain…". `EdgeCallFailedError` now carries the response's HTTP `status`, and a remote process control dies with `RemoteCommandRejectedError` for a refusal so the queued client stops retrying it.

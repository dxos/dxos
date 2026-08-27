---
'@dxos/echo': patch
---

Client initialization no longer hangs when the invitations query stream stalls, fails, or closes before delivering its initial snapshot — the app boots and reports invitations as unavailable instead of timing out. PostHog error capture failures are also contained so they can no longer break the fatal-error dialog that reports them.

---
'@dxos/plugin-connector': patch
---

A sign-in the app discards now says so. Previously an OAuth reply that failed the origin check, arrived in an unrecognized shape, or was rejected by the provider was dropped with nothing shown: the user completed the popup and came back to the same Connect button, with no way to tell a broken service configuration from a flow they had not finished. Each case now raises a toast alongside the existing log line, and a provider-reported failure carries the provider's own reason.

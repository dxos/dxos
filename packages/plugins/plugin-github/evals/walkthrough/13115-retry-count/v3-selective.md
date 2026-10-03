# Raise the EDGE notarization retry count to 5

The notarization plugin gives up on the EDGE agent after too few attempts. This change raises the
retry ceiling so a transient EDGE outage does not fail notarization outright.

## Raise the retry ceiling

Two retries was tuned for a fast, reliable EDGE agent; a slower or momentarily unavailable one
exhausts that budget before it recovers.

```diff file=packages/sdk/client-services/src/packlets/spaces/notarization-plugin.ts lines=35-41

```

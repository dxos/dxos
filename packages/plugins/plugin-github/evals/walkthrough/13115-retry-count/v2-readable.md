# Raise the EDGE notarization retry count to 5

Notarization against EDGE gave up after two retries. Transient EDGE unavailability during that
window failed the notarize call outright, so the limit goes up to five.

## Retry limit

`MAX_EDGE_RETRIES` bounds how many times the notarization plugin retries a failed EDGE call before
giving up.

```diff file=packages/sdk/client-services/src/packlets/spaces/notarization-plugin.ts lines=35-38

```

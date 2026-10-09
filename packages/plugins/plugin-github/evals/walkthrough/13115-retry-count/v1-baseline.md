# Raise the EDGE notarization retry count to 5

This change increases the number of times a space's EDGE notarization plugin retries against the
notarization service before giving up, from 2 to 5.

## The retry budget was too tight for EDGE's polling interval

The plugin polls EDGE for an active writer every 3 seconds and gives each notarization attempt up
to 10 seconds before timing out. At 2 retries, a couple of slow or contended rounds against EDGE
exhausted the budget well before the underlying condition (no writer yet elected, notarization
backlog) had a realistic chance to clear. Raising the ceiling to 5 gives the same polling loop
substantially more time to succeed without changing the interval or timeout themselves.

```diff file=packages/sdk/client-services/src/packlets/spaces/notarization-plugin.ts lines=35-39

```

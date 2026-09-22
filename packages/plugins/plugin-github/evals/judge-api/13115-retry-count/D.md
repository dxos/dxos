# Raise the EDGE notarization retry count to 5

This change raises the maximum number of retries the notarization plugin makes against EDGE from
2 to 5. It is a single constant edit with no accompanying logic change.

## Retry budget

The constant governs how many times the plugin retries a notarization request against EDGE before
giving up.

```diff file=packages/sdk/client-services/src/packlets/spaces/notarization-plugin.ts lines=35-41

```

The surrounding constants show the budget this retry count operates inside: a ten second notarize
timeout and a three second active-EDGE polling interval. Five retries fits more attempts inside
that timeout window than the previous two did.

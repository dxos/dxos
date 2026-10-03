---
'@dxos/app-toolkit': minor
---

`NativePasskey.getPasskeySupport()` now reports `'native'` in the Composer iOS app, which creates and redeems passkeys through its own AuthenticationServices bridge, and `'none'` when that bridge is missing, never WebAuthn. `createNativePasskey` and `loginNativePasskey` invoke whichever bridge the shell names. New: `NativePasskey.isNativePasskeyError()` recognises the iOS bridge's structured rejection, so `PasskeyError` treats only a dismissed sheet as a dismissal and reports every other `ASAuthorizationError` as a failure.

`@dxos/util`'s storage cleanup helpers (`clearServiceWorkers`, `clearCaches`, `clearOPFS`, `clearIndexedDB`) resolve where their API is absent, as in a WKWebView on a custom scheme, instead of throwing.

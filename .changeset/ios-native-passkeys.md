---
'@dxos/app-toolkit': minor
'@dxos/plugin-client': patch
---

`NativePasskey.getPasskeySupport()` now reports `'native'` in the Composer iOS app, which creates and redeems passkeys through its own AuthenticationServices bridge, and `'none'` when that bridge is missing, never WebAuthn. `createNativePasskey` and `loginNativePasskey` invoke whichever bridge the shell names. New: `NativePasskey.isNativePasskeyError()` recognises the iOS bridge's structured rejection, so `PasskeyError` treats only a dismissed sheet as a dismissal and reports every other `ASAuthorizationError` as a failure.

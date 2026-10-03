---
'@dxos/app-toolkit': minor
---

`NativePasskey.getPasskeySupport()` replaces `supportsNativePasskeys()` and returns `'native'`, `'web'` or `'none'`. The macOS desktop app reports `'none'` unless its shell confirms that its signed identity can complete a passkey request, so builds that can't finish one no longer offer passkeys or hang on an empty system sheet. Breaking: `supportsNativePasskeys()` is removed.

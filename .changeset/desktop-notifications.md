---
'@dxos/app-toolkit': minor
'@dxos/plugin-native': minor
---

The desktop app shows invitations and messages as system notifications while Composer runs, turned on under its settings with a Send test button: plugin-native contributes the new `AppCapabilities.LocalNotifier`, and plugin-messenger uses it wherever no push service exists.

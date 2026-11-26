---
'@dxos/plugin-onboarding': minor
'@dxos/app-toolkit': patch
---

A space invitation link opened while signed out is held behind the welcome gate and redeemed once the user signs in or signs up, including when sign-in finishes in another tab. `LayoutOperation.UpdateDialog` with a `subject` and `state: false` now closes the dialog only while that subject is shown, in every layout.

---
'@dxos/plugin-client': patch
---

Fix device-invitation links hanging in apps with onboarding: invitation URL params are now consumed by a single owner (`invitationUrlHandler: false` disables the plugin-client/plugin-space navigation handlers so plugin-onboarding owns the flow), an invitation arriving with an existing identity opens the reset-and-join dialog instead of being dropped, navigation-handler failures surface as a toast instead of dying silently, and `dx halo share --open` always prints the invitation code and reports browser-launch failures with the invitation URL.

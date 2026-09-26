# @dxos/plugin-native

## 0.12.0

### Minor Changes

- 11de244: `@dxos/app-toolkit/AppUpdate` defines an update status and manager that the web and native apps
  share, contributed through `AppCapabilities.UpdateManager`, and `useUpdateRow` renders it.
  plugin-pwa now contributes a manager and a settings panel with a "Check for updates" row, so the web
  app can check for, download and apply an update the way the desktop app can.

  **Breaking:** plugin-native's update manager renames `relaunch` to `apply`, and its `downloading`
  status carries `progress: { completed, total, unit }` in place of `downloaded` / `contentLength`.

### Patch Changes

- 41f8bee: Give each Composer desktop release channel its own localhost asset-server port, so channel apps installed side by side no longer serve each other's bundles.
- 58d834d: Distinguish the two disabled updater states in settings: a platform with no OTA channel still reads "Updates are not available on this platform", while a dev-server build on a platform that does support OTA now reads "Updates are not enabled in dev mode".
- 8205a8c: Spawn Ollama as a scoped shell command (`ollama` at `$RESOURCE/ollama`) instead of a Tauri sidecar, so the launcher is no longer signed with the app's restricted entitlements and killed by macOS at launch. Hosts must grant `shell:allow-spawn` for `{ "name": "ollama", "cmd": "$RESOURCE/ollama", "args": ["serve"] }` and bundle the launcher at `Contents/Resources/ollama`. Connection failures and unexpected process exits are now logged.
- Updated dependencies [0280a6a]
- Updated dependencies [375de88]
- Updated dependencies [86d1482]
- Updated dependencies [4025ffe]
- Updated dependencies [2cad6c0]
- Updated dependencies [cd205fb]
- Updated dependencies [a1a22ee]
- Updated dependencies [b7d66c8]
- Updated dependencies [8363f12]
- Updated dependencies [a7f4329]
- Updated dependencies [155ca6f]
- Updated dependencies [24cbdff]
- Updated dependencies [c50f666]
- Updated dependencies [a7f4329]
- Updated dependencies [9477170]
- Updated dependencies [0524d38]
- Updated dependencies [4ececc6]
- Updated dependencies [96f94c2]
- Updated dependencies [cd6f37f]
- Updated dependencies [a1075de]
- Updated dependencies [09c1f56]
- Updated dependencies [9fe88c8]
- Updated dependencies [b83d607]
- Updated dependencies [15f952c]
- Updated dependencies [b47fd84]
- Updated dependencies [3c7b013]
- Updated dependencies [fd873d2]
- Updated dependencies [c020513]
- Updated dependencies [ab734ba]
- Updated dependencies [1a8043c]
- Updated dependencies [6d52561]
- Updated dependencies [520c34f]
- Updated dependencies [28b7621]
- Updated dependencies [9714c75]
- Updated dependencies [4a0b78b]
- Updated dependencies [34a8433]
- Updated dependencies [bd6ba8e]
- Updated dependencies [b8762ef]
- Updated dependencies [f3f55a8]
- Updated dependencies [51c7e91]
- Updated dependencies [abf082c]
- Updated dependencies [4521dec]
- Updated dependencies [b2d5bb2]
- Updated dependencies [2d4107f]
- Updated dependencies [fd23a8b]
- Updated dependencies [45e7e4a]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [2fd4095]
- Updated dependencies [49aee6c]
- Updated dependencies [5305365]
- Updated dependencies [5dc2419]
- Updated dependencies [a09e18e]
- Updated dependencies [dd17e57]
- Updated dependencies [6d28380]
- Updated dependencies [329faa0]
- Updated dependencies [d770fe7]
- Updated dependencies [88e3ebd]
- Updated dependencies [a7f4329]
- Updated dependencies [ab56cfe]
- Updated dependencies [2643a00]
- Updated dependencies [dbff1e4]
- Updated dependencies [3e02201]
- Updated dependencies [2e4c299]
- Updated dependencies [b02fe16]
- Updated dependencies [7b49616]
- Updated dependencies [f0d3620]
- Updated dependencies [472ca95]
- Updated dependencies [bd792a6]
- Updated dependencies [8608f03]
- Updated dependencies [7d000b9]
- Updated dependencies [cafa240]
- Updated dependencies [813069c]
- Updated dependencies [8c20ee2]
- Updated dependencies [967b130]
- Updated dependencies [2c06e2e]
- Updated dependencies [098a0bb]
- Updated dependencies [882ac2a]
- Updated dependencies [3ea0b0f]
- Updated dependencies [9c86066]
- Updated dependencies [81b5eb2]
- Updated dependencies [9477170]
- Updated dependencies [cc45381]
- Updated dependencies [4aa6a33]
- Updated dependencies [9d2466a]
- Updated dependencies [557e243]
- Updated dependencies [29543ca]
- Updated dependencies [e26af7e]
- Updated dependencies [ab79741]
- Updated dependencies [8efc4f1]
- Updated dependencies [77a2d34]
- Updated dependencies [61fe676]
- Updated dependencies [d4b4919]
- Updated dependencies [63e500b]
- Updated dependencies [b72c1a2]
- Updated dependencies [7c426d4]
- Updated dependencies [b1bb838]
- Updated dependencies [5959b41]
- Updated dependencies [1ab4bb8]
- Updated dependencies [32468c3]
- Updated dependencies [0a3e9dd]
- Updated dependencies [e2b04f6]
- Updated dependencies [256f286]
- Updated dependencies [306f50d]
- Updated dependencies [8f372ce]
- Updated dependencies [b7822a7]
- Updated dependencies [c8b65f3]
- Updated dependencies [9feee5e]
- Updated dependencies [f2d8a92]
- Updated dependencies [0e44f24]
- Updated dependencies [bd06669]
- Updated dependencies [983fe1d]
- Updated dependencies [1d6f730]
- Updated dependencies [dea5df9]
- Updated dependencies [9ffccd5]
- Updated dependencies [fc83abd]
- Updated dependencies [178bc6d]
- Updated dependencies [58b59d7]
- Updated dependencies [efa7836]
- Updated dependencies [678ba58]
- Updated dependencies [8904184]
- Updated dependencies [a805212]
- Updated dependencies [6fed038]
- Updated dependencies [886453b]
- Updated dependencies [582fc22]
- Updated dependencies [892b718]
- Updated dependencies [63629c5]
- Updated dependencies [6a1ec57]
- Updated dependencies [e3d7a8c]
- Updated dependencies [5dedae9]
- Updated dependencies [3ea8217]
- Updated dependencies [631df48]
- Updated dependencies [e8088ea]
- Updated dependencies [bb94124]
- Updated dependencies [1a3de22]
- Updated dependencies [4c5b2c7]
- Updated dependencies [f9816c0]
- Updated dependencies [578b543]
- Updated dependencies [6fd2a5d]
- Updated dependencies [525aee0]
- Updated dependencies [a20d4d9]
- Updated dependencies [12bf248]
- Updated dependencies [f112c37]
- Updated dependencies [8048e42]
- Updated dependencies [e426625]
- Updated dependencies [3d23fd7]
- Updated dependencies [a1d42c4]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
- Updated dependencies [11de244]
- Updated dependencies [6dadb41]
  - @dxos/app-framework@0.12.0
  - @dxos/app-toolkit@0.12.0
  - @dxos/plugin-assistant@0.12.0
  - @dxos/ai@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/react-ui-form@0.12.0
  - @dxos/util@0.12.0
  - @dxos/log@0.12.0

## 0.11.1

### Patch Changes

- @dxos/ai@0.11.1
- @dxos/app-framework@0.11.1
- @dxos/app-toolkit@0.11.1
- @dxos/effect@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/util@0.11.1
- @dxos/plugin-assistant@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [f9ba47a]
- Updated dependencies [e0e1a9f]
- Updated dependencies [5b05d75]
- Updated dependencies [b5ecf54]
- Updated dependencies [a256a87]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [3f1fc67]
- Updated dependencies [2048cb3]
- Updated dependencies [6a03a30]
- Updated dependencies [2fe5a7a]
- Updated dependencies [717edc0]
- Updated dependencies [d958118]
- Updated dependencies [30ae5eb]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [9f7d5ad]
- Updated dependencies [717edc0]
- Updated dependencies [51aaffe]
- Updated dependencies [801b77f]
- Updated dependencies [f10b1ce]
- Updated dependencies [717edc0]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [c9da903]
- Updated dependencies [55bb048]
- Updated dependencies [bdf9f68]
- Updated dependencies [ed992c2]
- Updated dependencies [08a3eea]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [5585ec8]
- Updated dependencies [499dde4]
  - @dxos/plugin-assistant@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/app-toolkit@0.11.0
  - @dxos/util@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/react-ui-form@0.11.0
  - @dxos/log@0.11.0
  - @dxos/ai@0.11.0
  - @dxos/effect@0.11.0

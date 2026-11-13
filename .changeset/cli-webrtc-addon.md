---
'@dxos/cli-util': minor
'@dxos/network-manager': minor
'@dxos/plugin-client': minor
---

The compiled `dx` binary embeds each target's `node-datachannel` addon, so WebRTC device joins such as `dx account login --method composer` work from the binary again. `dx debug webrtc` opens a data channel between two local peers to check it. `dx account login` always prints the sign-in link, and `--no-open` skips opening it in the default browser. `@dxos/cli-util` adds `presentUrl`, and `@dxos/network-manager` exports `getRtcConnectionFactory`.

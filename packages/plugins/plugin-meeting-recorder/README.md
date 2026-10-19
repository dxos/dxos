# @dxos/plugin-meeting-recorder

Granola-style meeting notes for Composer Desktop. Detects when another app (Zoom, Meet in a browser,
Teams, FaceTime, Slack huddles) starts using the microphone, offers to take notes, and records the
meeting into a `Meeting` object (`@dxos/plugin-meeting`) with a live transcript — your microphone as
you, the system audio as the other participants — then summarizes it when the call ends.

The native half is the `tauri-plugin-meeting-capture` crate in
`packages/apps/composer-app/src-tauri/plugins/meeting-capture` (macOS: CoreAudio process objects for
detection, a process tap for system audio). In a browser the plugin still records from the
microphone, started by hand.

See [PLUGIN.mdl](./PLUGIN.mdl) for the specification.

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- Talk to us on [Discord](https://dxos.org/discord)

License: [FSL-1.1-Apache-2.0](./LICENSE) Copyright 2026 © DXOS

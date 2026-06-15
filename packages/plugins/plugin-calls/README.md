# @dxos/plugin-calls

WebRTC video / audio conferencing for DXOS Composer.

See [PLUGIN.mdl](./PLUGIN.mdl) for the specification.

This plugin owns everything required to join, render, and leave a multi-party
real-time call. Calls attach to existing objects (typically a `Channel` from
`@dxos/plugin-thread`) via a `roomId` derived from the host object's DXN —
no persistent schema is contributed by this plugin.

Persistent meeting records, transcripts, and summaries are the responsibility
of `@dxos/plugin-meeting`, which composes on top of this plugin's
`CallsCapabilities.Manager` and `CallsCapabilities.EventHandler`.

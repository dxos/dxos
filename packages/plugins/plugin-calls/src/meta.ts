//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.calls', '0.8.3'),
  name: 'Calls',
  author: 'DXOS',
  description: trim`
    Calls adds WebRTC video and audio conferencing to Composer. A call room is
    derived from the DXN of any host object — typically a Channel — so starting
    a call requires no extra setup beyond the object that already exists in your
    space. The live call surface (participant grid, media controls, lobby) runs
    as a deck companion alongside the chat view so chat and video are
    independently scrollable and neither displaces the other.

    The plugin owns a CallManager capability that manages the WebRTC session for
    the lifetime of the client: joining a room, publishing local audio, video,
    and screenshare tracks to the Cloudflare Calls SFU, pulling remote tracks,
    and maintaining per-participant state (speaking detection, hand raise, pin).
    Peer discovery and track negotiation happen over DXOS swarm signalling so
    calls work without any additional signalling infrastructure.

    A pluggable Extension capability lets other plugins react to call lifecycle
    events (join, leave, media state changes) without being coupled to
    plugin-calls. plugin-meeting and plugin-transcription use this contract to
    start recording and transcription when a call begins and persist the
    artefacts when it ends. A display-name gate prevents users without a profile
    from joining; the Lobby component prompts for a name and resumes the join
    flow automatically on save.

    plugin-calls is fully independent of plugin-thread at runtime: the "Start
    video call" action is contributed to Channel articles via a graph
    type-extension, so plugin-thread renders chat-only without error when
    plugin-calls is absent. The devtools surface exposes live CallState,
    MediaState, and raw WebRTC stats from @peermetrics/webrtc-stats for
    diagnostic use.
  `,
  icon: 'ph--video-conference--regular',
  iconHue: 'cyan',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-calls',
  spec: 'PLUGIN.mdl',
  tags: ['labs'],
});
